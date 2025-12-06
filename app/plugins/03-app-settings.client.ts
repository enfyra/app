export default defineNuxtPlugin(() => {
  const route = useRoute();
  const router = useRouter();
  const { settings } = useGlobalState();
  const { schemas } = useSchema();
  const { menuItems } = useMenuRegistry();

  function updateAppTitleAndFavicon(newSettings: any) {
    if (!newSettings || Object.keys(newSettings).length === 0) return;

    const projectName = newSettings.projectName;
    const projectDescription = newSettings.projectDescription;
    const projectFavicon = newSettings.projectFavicon;

    if (projectFavicon) {
      const linkId = "dynamic-favicon";
      const existingLink = document.getElementById(linkId);
      
      if (existingLink) {
        existingLink.remove();
      }

      let faviconUrl = projectFavicon;
      if (!projectFavicon.startsWith('http://') && !projectFavicon.startsWith('https://') && !projectFavicon.startsWith('/')) {
        faviconUrl = `/assets/${projectFavicon}`;
      }

      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "icon";
      link.type = "image/x-icon";
      link.href = faviconUrl;
      document.head.appendChild(link);
    }
  }

  function findMenuByRoute(path: string) {
    const exactMatch = menuItems.value.find(
      (item) => item.route === path || item.path === path
    );
    if (exactMatch) {
      return exactMatch;
    }

    const pathSegments = path.split('/').filter(Boolean);
    
    let bestMatch: any = null;
    let bestMatchLength = 0;
    
    for (const item of menuItems.value) {
      const itemRoute = item.route || item.path;
      if (!itemRoute) continue;

      const itemSegments = itemRoute.split('/').filter(Boolean);
      
      if (itemSegments.length === 0) continue;

      if (itemSegments.length !== pathSegments.length) continue;

      let matches = true;
      for (let i = 0; i < itemSegments.length; i++) {
        const itemSegment = itemSegments[i];
        const pathSegment = pathSegments[i];

        if (!itemSegment || !pathSegment) {
          matches = false;
          break;
        }

        if (itemSegment.startsWith('[') && itemSegment.endsWith(']')) {
          continue;
        }

        if (itemSegment !== pathSegment) {
          matches = false;
          break;
        }
      }

      if (matches && itemSegments.length > bestMatchLength) {
        bestMatch = item;
        bestMatchLength = itemSegments.length;
      }
    }

    return bestMatch;
  }

  function findParentMenu(path: string) {
    const pathSegments = path.split('/').filter(Boolean);
    
    for (let i = pathSegments.length - 1; i > 0; i--) {
      const parentPath = '/' + pathSegments.slice(0, i).join('/');
      const parentMenu = menuItems.value.find(
        (item) => (item.route === parentPath || item.path === parentPath) && item.type === 'Dropdown Menu'
      );
      if (parentMenu) return parentMenu;
    }

    return null;
  }

  function getTableNameFromRoute(): string | null {
    const tableParam = route.params.table;
    return tableParam ? String(tableParam) : null;
  }

  function getTableSchema(tableName: string) {
    return schemas.value[tableName];
  }

  function updateDocumentTitleAndDescription() {
    const path = route.path;
    const projectName = settings.value?.projectName || 'Enfyra';
    const projectDescription = settings.value?.projectDescription || 'Content Management System';

    let title = projectName;
    let description = projectDescription;

    if (path.startsWith('/collections/') && path.match(/^\/collections\/[^/]+$/)) {
      const tableName = getTableNameFromRoute();
      if (tableName) {
        const schema = getTableSchema(tableName);
        if (schema) {
          title = `Edit Table: ${schema.name || tableName}`;
          description = schema.description || projectDescription;
        } else {
          title = `Edit Table: ${tableName}`;
          description = projectDescription;
        }
      }
    } else if (path.startsWith('/settings/')) {
      const segments = path.split('/').filter(Boolean);
      const settingType = segments[1];
      
      if (settingType && segments.length === 2) {
        const menuItem = findMenuByRoute(path);
        
        if (menuItem && menuItem.label && menuItem.route === path) {
          title = menuItem.label;
          if (menuItem.description) {
            description = menuItem.description;
          }
        } else {
          title = settingType.charAt(0).toUpperCase() + settingType.slice(1);
          description = projectDescription;
        }
      } else if (settingType && segments.length > 2) {
        const lastSegment = segments[segments.length - 1];
        if (lastSegment === 'create') {
          const parentPath = `/settings/${settingType}`;
          const parentMenuItem = findMenuByRoute(parentPath);
          const parentLabel = parentMenuItem?.label || settingType.charAt(0).toUpperCase() + settingType.slice(1);
          title = `Create New ${parentLabel}`;
          description = projectDescription;
        } else if (lastSegment !== 'index') {
          const parentPath = `/settings/${settingType}`;
          const parentMenuItem = findMenuByRoute(parentPath);
          const parentLabel = parentMenuItem?.label || settingType.charAt(0).toUpperCase() + settingType.slice(1);
          title = `${parentLabel}: ${lastSegment}`;
          description = projectDescription;
        } else {
          const menuItem = findMenuByRoute(path);
          if (menuItem && menuItem.label) {
            title = menuItem.label;
            if (menuItem.description) {
              description = menuItem.description;
            }
          } else {
            const parentMenu = findParentMenu(path);
            if (parentMenu && parentMenu.label) {
              title = parentMenu.label;
              if (parentMenu.description) {
                description = parentMenu.description;
              }
            } else {
              title = settingType.charAt(0).toUpperCase() + settingType.slice(1);
              description = projectDescription;
            }
          }
        }
      }
    } else {
      const menuItem = findMenuByRoute(path);

      if (menuItem) {
        title = menuItem.label || title;
        if (menuItem.description) {
          description = menuItem.description;
        }
      } else {
        const parentMenu = findParentMenu(path);
        if (parentMenu) {
          title = parentMenu.label || title;
          if (parentMenu.description) {
            description = parentMenu.description;
          }
        }
      }
    }

    if (title !== projectName) {
      title = `${title} - ${projectName}`;
    }

    useHead({
      title,
      meta: [
        {
          name: 'description',
          content: description,
        },
      ],
    });
  }

  watch(
    () => settings.value,
    (newSettings) => {
      updateAppTitleAndFavicon(newSettings);
      updateDocumentTitleAndDescription();
    },
    { immediate: true, deep: true }
  );

  router.afterEach(() => {
    setTimeout(() => {
      updateDocumentTitleAndDescription();
    }, 100);
  });

  watch(
    () => route.path,
    () => {
      setTimeout(() => {
        updateDocumentTitleAndDescription();
      }, 100);
    },
    { immediate: true }
  );

  watch(
    () => schemas.value,
    () => {
      setTimeout(() => {
        updateDocumentTitleAndDescription();
      }, 100);
    },
    { deep: true }
  );

  watch(
    () => route.params,
    () => {
      setTimeout(() => {
        updateDocumentTitleAndDescription();
      }, 100);
    },
    { deep: true, immediate: true }
  );

  watch(
    () => menuItems.value,
    () => {
      setTimeout(() => {
        updateDocumentTitleAndDescription();
      }, 100);
    },
    { deep: true }
  );

  if (process.client) {
    setTimeout(() => {
      updateDocumentTitleAndDescription();
    }, 200);
  }
});
