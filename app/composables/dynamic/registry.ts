import { markRaw, ref } from "vue";
import type { PreviewState } from "./types";
import {
  UIcon,
  UButton,
  UCard,
  UBadge,
  UInput,
  UTextarea,
  USelect,
  UCheckbox,
  USwitch,
  UModal,
  UPopover,
  UTooltip,
  UAlert,
  UAvatar,
  UProgress,
  UTable,
  UPagination,
  UBreadcrumb,
  UTabs,
  UAccordion,
  UForm,
  UDrawer,
  UDropdownMenu,
  UContextMenu,
  USkeleton,
  UCollapsible,
  USeparator,
  URadioGroup,
  UCheckboxGroup,
  UInputNumber,
  UInputDate,
  UInputTime,
  UInputTags,
  UFileUpload,
  UColorPicker,
  USlider,
  UStepper,
  UTimeline,
  UMarquee,
  UCommandPalette,
  UCarousel,
  UCalendar,
  UTree,
  UPinInput,
  ULink,
  UContainer,
  UPage,
  UPageHeader,
  UPageHero,
  UPageGrid,
  UPageCard,
  UPageSection,
  UPageBody,
  UPageAside,
  UPageCTA,
  UPageFeature,
  UPageLinks,
  UPageList,
  UPageLogos,
  UPageAnchors,
  UPageColumns,
  UError,
  UEmpty,
  UFooter,
  UFooterColumns,
  UHeader,
  UMain,
  UOverlayProvider,
  UToast,
  UToaster,
  UFormField,
  UFieldGroup,
  UInputMenu,
  USelectMenu,
  ULinkBase,
  UUser,
  UAvatarGroup,
  UChip,
  UKbd,
  CommonLoadingState,
  CommonEmptyState,
  CommonSettingsCard,
  CommonLazyImage,
  PermissionGate,
  FormEditor,
  CommonUploadModal,
  DynamicWidgetComponent,
  FilterDrawer,
  DataTable,
} from "#components";

export const availableComponents = {
  UIcon: markRaw(UIcon),
  Icon: markRaw(UIcon),
  UButton: markRaw(UButton),
  UCard: markRaw(UCard),
  UBadge: markRaw(UBadge),
  UInput: markRaw(UInput),
  UTextarea: markRaw(UTextarea),
  USelect: markRaw(USelect),
  UCheckbox: markRaw(UCheckbox),
  USwitch: markRaw(USwitch),
  UModal: markRaw(UModal),
  UPopover: markRaw(UPopover),
  UTooltip: markRaw(UTooltip),
  UAlert: markRaw(UAlert),
  UAvatar: markRaw(UAvatar),
  UProgress: markRaw(UProgress),
  UTable: markRaw(UTable),
  DataTable: markRaw(DataTable),
  UPagination: markRaw(UPagination),
  UBreadcrumb: markRaw(UBreadcrumb),
  UTabs: markRaw(UTabs),
  UAccordion: markRaw(UAccordion),
  UForm: markRaw(UForm),
  UDrawer: markRaw(UDrawer),
  UDropdownMenu: markRaw(UDropdownMenu),
  UContextMenu: markRaw(UContextMenu),
  USkeleton: markRaw(USkeleton),
  UCollapsible: markRaw(UCollapsible),
  USeparator: markRaw(USeparator),
  URadioGroup: markRaw(URadioGroup),
  UCheckboxGroup: markRaw(UCheckboxGroup),
  UInputNumber: markRaw(UInputNumber),
  UInputDate: markRaw(UInputDate),
  UInputTime: markRaw(UInputTime),
  UInputTags: markRaw(UInputTags),
  UFileUpload: markRaw(UFileUpload),
  UColorPicker: markRaw(UColorPicker),
  USlider: markRaw(USlider),
  UStepper: markRaw(UStepper),
  UTimeline: markRaw(UTimeline),
  UMarquee: markRaw(UMarquee),
  UCommandPalette: markRaw(UCommandPalette),
  UCarousel: markRaw(UCarousel),
  UCalendar: markRaw(UCalendar),
  UTree: markRaw(UTree),
  UPinInput: markRaw(UPinInput),
  ULink: markRaw(ULink),
  UContainer: markRaw(UContainer),
  UPage: markRaw(UPage),
  UPageHeader: markRaw(UPageHeader),
  UPageHero: markRaw(UPageHero),
  UPageGrid: markRaw(UPageGrid),
  UPageCard: markRaw(UPageCard),
  UPageSection: markRaw(UPageSection),
  UPageBody: markRaw(UPageBody),
  UPageAside: markRaw(UPageAside),
  UPageCTA: markRaw(UPageCTA),
  UPageFeature: markRaw(UPageFeature),
  UPageLinks: markRaw(UPageLinks),
  UPageList: markRaw(UPageList),
  UPageLogos: markRaw(UPageLogos),
  UPageAnchors: markRaw(UPageAnchors),
  UPageColumns: markRaw(UPageColumns),
  UError: markRaw(UError),
  UEmpty: markRaw(UEmpty),
  UFooter: markRaw(UFooter),
  UFooterColumns: markRaw(UFooterColumns),
  UHeader: markRaw(UHeader),
  UMain: markRaw(UMain),
  UOverlayProvider: markRaw(UOverlayProvider),
  UToast: markRaw(UToast),
  UToaster: markRaw(UToaster),
  UFormField: markRaw(UFormField),
  UFieldGroup: markRaw(UFieldGroup),
  UInputMenu: markRaw(UInputMenu),
  USelectMenu: markRaw(USelectMenu),
  ULinkBase: markRaw(ULinkBase),
  UUser: markRaw(UUser),
  UAvatarGroup: markRaw(UAvatarGroup),
  UChip: markRaw(UChip),
  UKbd: markRaw(UKbd),
  PermissionGate: markRaw(PermissionGate),
  FormEditor: markRaw(FormEditor),
  FilterDrawer: markRaw(FilterDrawer),
  LoadingState: markRaw(CommonLoadingState),
  EmptyState: markRaw(CommonEmptyState),
  SettingsCard: markRaw(CommonSettingsCard),
  Image: markRaw(CommonLazyImage),
  UploadModal: markRaw(CommonUploadModal),
  Widget: markRaw(DynamicWidgetComponent),
};

export const availableComposables = {
  useState,
  useRoute,
  useRouter,
  useApi,
  useToast,
  useSchema,
  useScreen,
  useGlobalState,
  usePermissions,
  useFilterQuery,
  useDataTableColumns,
  useHeaderActionRegistry,
  useSubHeaderActionRegistry,
  usePageHeaderRegistry,
  useConfirm,
  useAuth,
  navigateTo,
  useFetch,
  useAsyncData,
  useLazyFetch,
  useHead,
  useSeoMeta,
  useCookie,
  useNuxtApp,
};

export function getComposablesForPreview(previewState?: PreviewState) {
  if (!previewState) {
    return availableComposables;
  }

  const headerActionsRef = previewState.headerActions || ref<any[]>([]);
  const subHeaderActionsRef = previewState.subHeaderActions || ref<any[]>([]);
  const pageHeaderRef = previewState.pageHeader || ref<any>(null);

  const mockUseHeaderActionRegistry = (actions?: any) => {
    if (actions) {
      const actionsArray = Array.isArray(actions) ? actions : [actions];
      actionsArray.forEach((action: any) => {
        headerActionsRef.value.push(action);
      });
    }
    return {
      headerActions: headerActionsRef,
      register: (action: any) => {
        headerActionsRef.value.push(action);
      },
    };
  };

  const mockUseSubHeaderActionRegistry = (actions?: any) => {
    if (actions) {
      const actionsArray = Array.isArray(actions) ? actions : [actions];
      actionsArray.forEach((action: any) => {
        subHeaderActionsRef.value.push(action);
      });
    }
    return {
      subHeaderActions: subHeaderActionsRef,
      register: (action: any) => {
        subHeaderActionsRef.value.push(action);
      },
    };
  };

  const mockUsePageHeaderRegistry = () => {
    return {
      pageHeader: pageHeaderRef,
      registerPageHeader: (config: any) => {
        pageHeaderRef.value = config;
      },
    };
  };

  return {
    ...availableComposables,
    useHeaderActionRegistry: mockUseHeaderActionRegistry,
    useSubHeaderActionRegistry: mockUseSubHeaderActionRegistry,
    usePageHeaderRegistry: mockUsePageHeaderRegistry,
  };
}
