export const useFileUrl = () => {
  const { getFileTimestamp } = useGlobalState();

  function getFileUrl(fileId: string, options?: {
    format?: string;
    width?: number;
    height?: number;
    quality?: number;
  }): string {
    if (!fileId) return '';

    let url = `/assets/${fileId}`;

    const params = new URLSearchParams();

    if (options?.format) {
      params.set('format', options.format);
    }

    if (options?.width) {
      params.set('width', options.width.toString());
    }
    if (options?.height) {
      params.set('height', options.height.toString());
    }

    if (options?.quality) {
      params.set('quality', options.quality.toString());
    }

    const timestamp = getFileTimestamp(fileId);
    if (timestamp) {
      params.set('t', timestamp.toString());
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    return url;
  }

  function getPreviewUrl(fileId: string): string {
    return getFileUrl(fileId, { format: 'webp', quality: 70 });
  }

  function getThumbnailUrl(fileId: string): string {
    return getFileUrl(fileId, {
      format: 'webp',
      width: 300,
      height: 300,
      quality: 70
    });
  }
  
  return {
    getFileUrl,
    getPreviewUrl,
    getThumbnailUrl
  };
};