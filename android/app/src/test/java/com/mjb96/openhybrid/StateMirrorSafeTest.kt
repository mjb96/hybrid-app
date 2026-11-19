package com.mjb96.openhybrid

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class StateMirrorSafeTest {
    @get:Rule
    val tmp = TemporaryFolder()

    private val stateOne = """{"weeks":{},"settings":{"name":"one"}}"""
    private val stateTwo = """{"weeks":{},"settings":{"name":"two"}}"""

    @Test
    fun writesReadsAndKeepsPreviousCopyAsBackup() {
        val dir = tmp.root
        assertNotNull(StateMirrorSafe.write(dir, stateOne))
        assertEquals(stateOne, StateMirrorSafe.read(dir).json)

        assertNotNull(StateMirrorSafe.write(dir, stateTwo))
        val result = StateMirrorSafe.read(dir)
        assertEquals(stateTwo, result.json)
        assertEquals("state", result.source)

        val backup = File(dir, StateMirrorSafe.BACKUP_NAME)
        assertTrue(backup.isFile)
        assertEquals(stateOne, backup.readText(Charsets.UTF_8))
        assertFalse(File(dir, StateMirrorSafe.TEMP_NAME).exists())
    }

    @Test
    fun readFallsBackToBackupWhenStateIsCorrupt() {
        val dir = tmp.root
        assertNotNull(StateMirrorSafe.write(dir, stateOne))
        assertNotNull(StateMirrorSafe.write(dir, stateTwo))

        // Corrupt the live file; the previous good copy is still in .bak.
        File(dir, StateMirrorSafe.FILE_NAME).writeText("not json", Charsets.UTF_8)
        val result = StateMirrorSafe.read(dir)
        assertEquals(stateOne, result.json)
        assertEquals("backup", result.source)
    }

    @Test
    fun clearRemovesStateTempAndBackup() {
        val dir = tmp.root
        assertNotNull(StateMirrorSafe.write(dir, stateOne))
        assertTrue(File(dir, StateMirrorSafe.FILE_NAME).isFile)

        assertTrue(StateMirrorSafe.clear(dir))
        assertFalse(File(dir, StateMirrorSafe.FILE_NAME).exists())
        assertFalse(File(dir, StateMirrorSafe.BACKUP_NAME).exists())
        assertFalse(File(dir, StateMirrorSafe.TEMP_NAME).exists())
        assertEquals("none", StateMirrorSafe.read(dir).source)
    }

    @Test
    fun rejectsEmptyArrayAndNonObjectDocuments() {
        assertNull(StateMirrorSafe.validJson(null))
        assertNull(StateMirrorSafe.validJson(""))
        assertNull(StateMirrorSafe.validJson("[]"))
        assertNull(StateMirrorSafe.validJson("\"text\""))
        assertNotNull(StateMirrorSafe.validJson("{}"))
        assertNotNull(StateMirrorSafe.validJson("""{"weeks":{}}"""))
    }

    @Test
    fun statusReportsTheLiveAndBackupCopies() {
        val dir = tmp.root
        val empty = StateMirrorSafe.status(dir)
        assertFalse(empty.exists)
        assertFalse(empty.backupExists)
        assertEquals(0L, empty.bytes)

        assertNotNull(StateMirrorSafe.write(dir, stateOne))
        assertNotNull(StateMirrorSafe.write(dir, stateTwo))
        val status = StateMirrorSafe.status(dir)
        assertTrue(status.exists)
        assertTrue(status.backupExists)
        assertTrue(status.bytes > 0)
        assertTrue(status.savedAt > 0)
    }
}
