package com.mjb96.openhybrid

import java.io.File
import java.io.FileOutputStream

/**
 * The durable half of the Android state mirror.
 *
 * The web layer writes the same serialized app state it puts in localStorage
 * into an app-private file after every save. This class owns the file format
 * and the atomic replace: a temp file is fsynced, the previous good copy is
 * kept as `.bak`, and the temp file is renamed over the live one. A crash can
 * therefore leave the old file, the new file, or the complete temp file, never
 * a half-written document.
 *
 * Pure Kotlin and file-directory based so it can be JVM-unit-tested without
 * Android (see StateMirrorSafeTest).
 */
object StateMirrorSafe {
    const val FILE_NAME = "openhybrid-state.json"
    const val BACKUP_NAME = "openhybrid-state.json.bak"
    const val TEMP_NAME = "openhybrid-state.json.tmp"

    /** The state is well under 2 MB; this only stops a pathological bridge call. */
    const val MAX_BYTES = 32 * 1024 * 1024

    data class WriteResult(val bytes: Int, val savedAt: Long)
    data class ReadResult(val json: String?, val savedAt: Long, val bytes: Int, val source: String)
    data class Status(val exists: Boolean, val bytes: Long, val savedAt: Long, val backupExists: Boolean)

    /** A valid mirror document is a non-empty JSON object within the size cap. */
    fun validJson(json: String?): String? {
        if (json == null) return null
        val trimmed = json.trim()
        if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null
        // Reject before allocating a byte copy for a pathological bridge call.
        if (json.length > MAX_BYTES) return null
        val bytes = json.toByteArray(Charsets.UTF_8)
        if (bytes.isEmpty() || bytes.size > MAX_BYTES) return null
        return json
    }

    /** Atomically write [json], keeping the previous good copy as `.bak`. */
    fun write(dir: File, json: String): WriteResult? {
        val safe = validJson(json) ?: return null
        if (!dir.exists() && !dir.mkdirs()) return null

        val target = File(dir, FILE_NAME)
        val backup = File(dir, BACKUP_NAME)
        val temp = File(dir, TEMP_NAME)
        val bytes = safe.toByteArray(Charsets.UTF_8)

        return try {
            FileOutputStream(temp).use { out ->
                out.write(bytes)
                out.flush()
                out.fd.sync()
            }
            if (target.exists()) {
                // Best effort: the temp file is already complete, so a failed
                // backup copy must not stop the new state being installed.
                runCatching { target.copyTo(backup, overwrite = true) }
            }
            if (!temp.renameTo(target)) {
                // Some filesystems refuse rename-over-existing. The temp file is
                // complete and fsynced; replace the target explicitly.
                if (target.exists() && !target.delete()) {
                    temp.delete()
                    return null
                }
                if (!temp.renameTo(target)) {
                    temp.delete()
                    return null
                }
            }
            WriteResult(bytes.size, target.lastModified())
        } catch (_: Exception) {
            temp.delete()
            null
        }
    }

    /**
     * Read the newest readable document. The temp file is checked before the
     * backup because a crash after fsync but before rename leaves a complete
     * new copy there; the backup is the previous good state.
     */
    fun read(dir: File): ReadResult {
        val candidates = listOf(
            File(dir, FILE_NAME) to "state",
            File(dir, TEMP_NAME) to "temp",
            File(dir, BACKUP_NAME) to "backup",
        )
        for ((file, source) in candidates) {
            val result = readOne(file, source) ?: continue
            return result
        }
        return ReadResult(null, 0L, 0, "none")
    }

    private fun readOne(file: File, source: String): ReadResult? {
        if (!file.isFile) return null
        val size = file.length()
        if (size <= 0L || size > MAX_BYTES.toLong()) return null
        val text = runCatching { file.readText(Charsets.UTF_8) }.getOrNull() ?: return null
        if (validJson(text) == null) return null
        return ReadResult(text, file.lastModified(), size.toInt(), source)
    }

    /** Remove every copy of the mirror. */
    fun clear(dir: File): Boolean {
        var ok = true
        for (name in listOf(FILE_NAME, TEMP_NAME, BACKUP_NAME)) {
            val file = File(dir, name)
            if (file.exists() && !file.delete()) ok = false
        }
        return ok
    }

    fun status(dir: File): Status {
        val target = File(dir, FILE_NAME)
        val backup = File(dir, BACKUP_NAME)
        val exists = target.isFile
        return Status(
            exists = exists,
            bytes = if (exists) target.length() else 0L,
            savedAt = if (exists) target.lastModified() else 0L,
            backupExists = backup.isFile,
        )
    }
}
