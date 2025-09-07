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
    
    // Build base URL
    let url = `/assets/${fileId}`;
    
    // Add query parameters
    const params = new URLSearchParams();
    
    // Add format
    if (options?.format) {
      params.set('format', options.format);
    }
    
    // Add dimensions
    if (options?.width) {
      params.set('width', options.width.toString());
    }
    if (options?.height) {
      params.set('height', options.height.toString());
    }
    
    // Add cache buster based on file update timestamp
    const timestamp = getFileTimestamp(fileId);
    if (timestamp) {
      params.set('t', timestamp.toString());
    }
    
    // Append params if any
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