/**
 * Saves a file served from another origin, such as a Convex storage URL.
 * Browsers ignore `<a download>` across origins, so the link would neither
 * name the file nor download it; fetching it into a same-origin blob does
 * both. Rejects when the file cannot be fetched.
 */
export async function downloadFile(url: string, fileName: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed with ${response.status}`);

  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  // Revoking right away can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
