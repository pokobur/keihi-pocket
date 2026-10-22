/**
 * Type declarations for WICG File System Access API
 */

declare global {
  interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite';
  }

  interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
  }

  interface OpenFilePickerOptions {
    types?: FilePickerAcceptType[];
    excludeAcceptAllOption?: boolean;
    multiple?: boolean;
  }

  interface SaveFilePickerOptions {
    types?: FilePickerAcceptType[];
    excludeAcceptAllOption?: boolean;
    suggestedName?: string;
  }

  interface FileSystemHandle {
    queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  }

  interface Window {
    showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  }
}

export {};
