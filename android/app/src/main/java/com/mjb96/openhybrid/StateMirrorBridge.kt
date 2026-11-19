package com.mjb96.openhybrid

import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject
import java.io.File
import java.time.Instant

/**
 * Android-only bridge for the app-private state mirror.
 *
 * The web layer treats localStorage as the fast copy and this file as the
 * durable copy. Every method receives a one-shot callback id, validated by
 * BridgeSafe, and resolves through the shared escaping primitive so no payload
 * byte can break out of the script string.
 *
 * Only read/write/clear/status are exposed. There is no path argument: the
 * directory is fixed inside the app's private files directory, and JSON is
 * size-capped by StateMirrorSafe before it reaches disk.
 */
class StateMirrorBridge(
    context: Context,
    private val webView: WebView,
) {
    private val dir = File(context.filesDir, "state-mirror")
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val mutex = Mutex()

    @JavascriptInterface
    fun read(callbackId: String) {
        val callback = BridgeSafe.callbackId(callbackId) ?: return
        scope.launch {
            mutex.withLock {
                val result = StateMirrorSafe.read(dir)
                resolve(callback, JSONObject().apply {
                    if (result.json == null) {
                        put("status", "empty")
                    } else {
                        put("status", "ok")
                        put("json", result.json)
                        put("savedAt", iso(result.savedAt))
                        put("bytes", result.bytes)
                        put("source", result.source)
                    }
                })
            }
        }
    }

    @JavascriptInterface
    fun write(json: String, callbackId: String) {
        val callback = BridgeSafe.callbackId(callbackId) ?: return
        val safe = StateMirrorSafe.validJson(json)
        if (safe == null) {
            resolve(callback, JSONObject()
                .put("status", "error")
                .put("message", "Invalid state document."))
            return
        }
        scope.launch {
            mutex.withLock {
                val result = StateMirrorSafe.write(dir, safe)
                if (result == null) {
                    resolve(callback, JSONObject()
                        .put("status", "error")
                        .put("message", "Could not write the state mirror."))
                } else {
                    resolve(callback, JSONObject().apply {
                        put("status", "saved")
                        put("bytes", result.bytes)
                        put("savedAt", iso(result.savedAt))
                    })
                }
            }
        }
    }

    @JavascriptInterface
    fun clear(callbackId: String) {
        val callback = BridgeSafe.callbackId(callbackId) ?: return
        scope.launch {
            mutex.withLock {
                val cleared = StateMirrorSafe.clear(dir)
                resolve(callback, JSONObject().put("status", if (cleared) "cleared" else "error"))
            }
        }
    }

    @JavascriptInterface
    fun status(callbackId: String) {
        val callback = BridgeSafe.callbackId(callbackId) ?: return
        scope.launch {
            mutex.withLock {
                val status = StateMirrorSafe.status(dir)
                resolve(callback, JSONObject().apply {
                    put("status", "ok")
                    put("exists", status.exists)
                    put("bytes", status.bytes)
                    put("savedAt", if (status.exists) iso(status.savedAt) else JSONObject.NULL)
                    put("backupExists", status.backupExists)
                })
            }
        }
    }

    private fun iso(epochMillis: Long): String =
        if (epochMillis <= 0L) "" else Instant.ofEpochMilli(epochMillis).toString()

    private fun resolve(callbackId: String, payload: JSONObject) {
        val script = BridgeSafe.callbackScript(REGISTRY, callbackId, payload.toString()) ?: return
        webView.post { webView.evaluateJavascript(script, null) }
    }

    private companion object {
        const val REGISTRY = "__openhybridStateMirrorCB"
    }
}
