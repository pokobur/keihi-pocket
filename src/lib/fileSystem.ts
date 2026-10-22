/**
 * File System Access API helper for Keihi Pocket
 * - Enables direct read/write to local JSON files (e.g. data.json) on desktop PC
 * - Handles file pickers, permission querying, and direct streaming writes
 */

import { KeihiPocketData } from '@/types';

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    'showSaveFilePicker' in window
  );
}

/**
 * Check permission status without prompting user
 */
export async function queryPermission(
  handle: FileSystemFileHandle,
  readWrite = true
): Promise<PermissionState> {
  try {
    const options: FileSystemHandlePermissionDescriptor = {
      mode: readWrite ? 'readwrite' : 'read',
    };
    return await handle.queryPermission(options);
  } catch (err) {
    console.error('Error querying permission:', err);
    return 'prompt';
  }
}

/**
 * Request permission from user (must be invoked during user gesture)
 */
export async function requestPermission(
  handle: FileSystemFileHandle,
  readWrite = true
): Promise<boolean> {
  try {
    const options: FileSystemHandlePermissionDescriptor = {
      mode: readWrite ? 'readwrite' : 'read',
    };
    const status = await handle.requestPermission(options);
    return status === 'granted';
  } catch (err) {
    console.error('Error requesting permission:', err);
    return false;
  }
}

/**
 * Verify permission, prompting user if necessary
 */
export async function verifyPermission(
  handle: FileSystemFileHandle,
  readWrite = true
): Promise<boolean> {
  const current = await queryPermission(handle, readWrite);
  if (current === 'granted') {
    return true;
  }
  return await requestPermission(handle, readWrite);
}

/**
 * Open local JSON file picker and read data
 */
export async function openLocalJsonFile(): Promise<{
  handle: FileSystemFileHandle;
  data: KeihiPocketData;
  fileName: string;
} | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('お使いのブラウザは File System Access API に対応していません。Google Chrome や Microsoft Edge などのデスクトップ版ブラウザをご利用ください。');
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          description: '経費ポケット JSON データファイル (*.json)',
          accept: {
            'application/json': ['.json'],
          },
        },
      ],
      multiple: false,
    });

    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text) as KeihiPocketData;

    if (!parsed || !parsed.settings || !Array.isArray(parsed.monthlyCycles)) {
      throw new Error('有効な経費ポケットのJSONデータ形式ではありません。');
    }

    return {
      handle,
      data: parsed,
      fileName: file.name,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      // User cancelled picker
      return null;
    }
    throw err;
  }
}

/**
 * Show save-as file picker and write current data to local disk
 */
export async function saveAsLocalJsonFile(
  data: KeihiPocketData,
  suggestedName = 'keihi-pocket-data.json'
): Promise<{ handle: FileSystemFileHandle; fileName: string } | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('お使いのブラウザは File System Access API に対応していません。');
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: '経費ポケット JSON データファイル (*.json)',
          accept: {
            'application/json': ['.json'],
          },
        },
      ],
    });

    const success = await writeDataToFileHandle(handle, data);
    if (!success) {
      throw new Error('ファイルへの書き込みに失敗しました。');
    }

    const file = await handle.getFile();
    return {
      handle,
      fileName: file.name,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      // User cancelled save
      return null;
    }
    throw err;
  }
}

/**
 * Write data to existing FileSystemFileHandle
 */
export async function writeDataToFileHandle(
  handle: FileSystemFileHandle,
  data: KeihiPocketData
): Promise<boolean> {
  try {
    const permission = await queryPermission(handle, true);
    if (permission !== 'granted') {
      const granted = await requestPermission(handle, true);
      if (!granted) {
        console.warn('File write permission not granted');
        return false;
      }
    }

    const writable = await handle.createWritable();
    const jsonStr = JSON.stringify(data, null, 2);
    await writable.write(jsonStr);
    await writable.close();
    return true;
  } catch (err) {
    console.error('Failed to write data to file handle:', err);
    return false;
  }
}

/**
 * Read data from existing FileSystemFileHandle
 */
export async function readDataFromFileHandle(
  handle: FileSystemFileHandle
): Promise<{ data: KeihiPocketData; fileName: string } | null> {
  try {
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text) as KeihiPocketData;

    if (!parsed || !parsed.settings || !Array.isArray(parsed.monthlyCycles)) {
      throw new Error('有効な経費ポケットのJSONデータ形式ではありません。');
    }

    return {
      data: parsed,
      fileName: file.name,
    };
  } catch (err) {
    console.error('Failed to read data from file handle:', err);
    return null;
  }
}
