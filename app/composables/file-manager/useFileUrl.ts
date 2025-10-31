export const useFileUrl = () => {
  const { getFileTimestamp } = useGlobalState();
  
  /**
   * Generate file URL with cache busting
   */
  function getFileUrl(fileId: string, options?: {
    format?: string;
    width?: number;
    height?: number;
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
  
  /**
   * Generate preview URL (alias for getFileUrl)
   */
  function getPreviewUrl(fileId: string): string {
    return getFileUrl(fileId, { format: 'avif' });
  }
  
  /**
   * Generate thumbnail URL
   */
  function getThumbnailUrl(fileId: string): string {
    return getFileUrl(fileId, { 
      format: 'avif',
      width: 300,
      height: 300
    });
  }
  
  return {
    getFileUrl,
    getPreviewUrl,
    getThumbnailUrl
  };
};