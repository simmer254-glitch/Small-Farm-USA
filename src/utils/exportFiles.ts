import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

// Saves text content to a real, shareable/downloadable file on every platform —
// web gets a Blob + <a download>, native gets a cache file handed to the share sheet.
export async function saveAndShareText(filename: string, content: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType });
  }
}

// Turns a CSV string into a local URI addDoc's upload path can read directly —
// web returns a blob: URL (addDoc's web branch already does fetch(uri).arrayBuffer(),
// same as every other web upload), native writes to a cache file and returns its uri.
export async function csvContentToLocalUri(content: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: 'text/csv' });
    return URL.createObjectURL(blob);
  }
  const file = new File(Paths.cache, `export-${Date.now()}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  return file.uri;
}

// Real PDF export. Web browsers can't produce a PDF Blob without a heavy
// client-side library, so the standard real behavior there is the browser's
// own print dialog (user picks "Save as PDF"); native generates an actual
// PDF file and hands it to the share sheet.
export async function printHtmlAsPdf(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  }
}
