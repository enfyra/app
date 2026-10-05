import type { FileManagerStorageOption, FileManagerUploadOptions } from '~/types/file-manager';

export function useFileManagerUpload(options: FileManagerUploadOptions) {
  const showUploadModal = ref(false);
  const selectedStorage = ref<FileManagerStorageOption>();
  const fileUploadProgressByIndex = ref<Record<number, number | null>>({});
  const uploadFileSizes = ref<number[]>([]);
  const notify = useNotify();
  const { getId } = useDatabase();
  const { storageConfigs, storageConfigsFetched, storageConfigsPending, storageConfigsError, fetchStorageConfigs } = useGlobalState();
  const { trackedUploadProgressById, beginTrackedUploadProgress, getUploadProgressHeaders, resetUploadProgress } = useFileUploadProgress();
  const { executeWithResult: uploadFilesApi, pending: uploadPending } = useApi(() => 'enfyra_file', {
    method: 'post',
    errorContext: 'Upload Files',
  });

  const storageOptions = computed<FileManagerStorageOption[]>(() => storageConfigs.value.map(config => ({
    label: config.isDefault ? `${config.name} (Default)` : config.name,
    value: String(getId(config)),
    icon: ['Amazon S3', 'Google Cloud Storage', 'Cloudflare R2'].includes(config.type) ? 'lucide:cloud' : 'lucide:hard-drive',
    isDefault: config.isDefault === true,
  })));

  const aggregateUploadProgress = computed(() => {
    if (uploadFileSizes.value.length === 0) return null;
    const totalBytes = uploadFileSizes.value.reduce((sum, size) => sum + size, 0);
    if (totalBytes <= 0) return 0;
    const loadedBytes = uploadFileSizes.value.reduce((sum, size, index) => sum + size * (fileUploadProgressByIndex.value[index] ?? 0) / 100, 0);
    return Math.min(100, Math.max(0, Math.round(loadedBytes / totalBytes * 100)));
  });

  watch(showUploadModal, async open => {
    if (!open) {
      fileUploadProgressByIndex.value = {};
      uploadFileSizes.value = [];
      resetUploadProgress();
      return;
    }
    if (!storageConfigsFetched.value) await fetchStorageConfigs();
    if (!showUploadModal.value) return;
    const defaultOption = storageOptions.value.find(option => option.isDefault);
    if (defaultOption) selectedStorage.value = defaultOption;
  });

  async function handleFileUpload(files: File | File[]) {
    if (uploadPending.value) return;
    const fileArray = Array.isArray(files) ? files : [files];
    if (fileArray.length === 0) return;
    const folderId = options.folderId?.();
    uploadFileSizes.value = fileArray.map(file => file.size);
    fileUploadProgressByIndex.value = Object.fromEntries(fileArray.map((_, index) => [index, 0]));
    const formDataArray = fileArray.map(file => {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folder', folderId);
      if (selectedStorage.value) formData.append('storageConfig', selectedStorage.value.value);
      return formData;
    });
    const uploadIds = formDataArray.map(() => beginTrackedUploadProgress());
    const stopProgressWatch = watch(trackedUploadProgressById, progress => {
      fileUploadProgressByIndex.value = Object.fromEntries(uploadIds.map((id, index) => [index, progress[id] ?? 0]));
    }, { immediate: true });

    try {
      const result = await uploadFilesApi({
        files: formDataArray,
        headersByIndex: Object.fromEntries(uploadIds.map((id, index) => [index, getUploadProgressHeaders(id)])),
      });
      if (!result.ok) {
        resetUploadProgress();
        return;
      }
      fileUploadProgressByIndex.value = Object.fromEntries(fileArray.map((_, index) => [index, 100]));
      await options.onUploaded();
      showUploadModal.value = false;
      selectedStorage.value = undefined;
      fileUploadProgressByIndex.value = {};
      uploadFileSizes.value = [];
      resetUploadProgress();
      notify.success('Success', `${fileArray.length} file(s) uploaded successfully`);
    } finally {
      stopProgressWatch();
    }
  }

  return { showUploadModal, selectedStorage, storageOptions, storageConfigsPending, storageConfigsError, fetchStorageConfigs, aggregateUploadProgress, fileUploadProgressByIndex, uploadPending, handleFileUpload };
}
