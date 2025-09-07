# Enfyra App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Nuxt](https://img.shields.io/badge/Nuxt-4-green.svg)](https://nuxt.com/)
[![Vue](https://img.shields.io/badge/Vue-3-green.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

A modern, extensible headless CMS built with Nuxt 4, featuring dynamic table management, extension system, API composables with automatic error handling, and a responsive Vue.js interface.

## Features

- **Dynamic Table Management** - Create and modify database tables on the fly
- **Built-in API Composables** - `useApi` and `useApiLazy` with automatic error handling
- **Toast Notifications** - Automatic error notifications with context
- **TypeScript Support** - Full type safety throughout the application
- **Extension System** - Extensible architecture with dynamic extension loading
- **Responsive Design** - Mobile-friendly interface
- **Authentication System** - Built-in user authentication and roles
- **Permission System** - Comprehensive role-based access control (RBAC)
- **Menu Registry** - Dynamic sidebar and menu management
- **Header Actions** - Configurable header button system

## 📚 Documentation

### 🚀 **Quick Start**

**New to Enfyra App? Start here!**

- **[📖 Getting Started Guide](./docs/getting-started.md)** - **Complete step-by-step tutorial from setup to building your first features** (30 min → productivity)

### 🏗️ **Architecture & Core Systems**

- **[Project Structure](./docs/project-structure.md)** - Complete codebase organization and architecture patterns
- **[API Composables Guide](./docs/api-composables.md)** - Data fetching, error handling, and API integration patterns
- **[Permission System](./docs/permission-system.md)** - Role-based access control with PermissionGate and usePermissions
- **[Filter System](./docs/filter-query.md)** - Advanced data filtering with visual query builder
- **[Form Field System](./docs/form-field.md)** - Dynamic form generation, validation, and schema integration

### ⚡ **UI & Interaction**

- **[DataTable Component](./docs/data-table.md)** - Feature-rich table component with sorting, selection, and context menus
- **[Image Component](./docs/image.md)** - Optimized image component with lazy loading, format optimization, and error handling
- **[Header Action Registry](./docs/header-action-registry.md)** - Dynamic header buttons and interactive controls
- **[Settings Card](./docs/settings-card.md)** - Consistent settings UI component patterns

### 🔧 **Advanced Development**

- **[Extension Development Guide](./docs/extension-development-guide.md)** - Create custom extensions with full feature integration

---

## 📋 **Learning Path**

### **🔰 Beginner (First Day)**

```
1. 📖 Getting Started Guide → Build your first features (30 min)
2. 🏗️ Project Structure → Understand the codebase (10 min)
3. 🔧 API Composables → Learn data patterns (15 min)
```

### **🎯 Intermediate (First Week)**

```
4. 🛡️ Permission System → Secure your UI (20 min)
5. 📝 Form Fields → Dynamic forms (30 min)
6. 🔍 Filter System → Advanced search (30 min)
```

### **🚀 Advanced (Production Ready)**

```
7. ⚡ Header Actions → Interactive UI (15 min)
8. 🎨 Settings Cards → Consistent layouts (15 min)
9. 🧩 Extension Development → Custom features (2-4 hours)
```

**Total Time to Productivity: ~6 hours of focused learning**

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npx nuxi typecheck

# Build for production
npm run build
```

## Contributing

We welcome contributions! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/enfyra-app.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/amazing-feature`
5. Make your changes and commit: `git commit -m 'Add amazing feature'`
6. Push to your branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](./docs/)
- 🐛 [Issues](https://github.com/dothinh115/dynamiq_cms/issues)
- 💬 [Discussions](https://github.com/dothinh115/dynamiq_cms/discussions)

## Credits

Built with ❤️ using:

- [Nuxt.js](https://nuxt.com/) - The Vue.js Framework
- [Vue.js](https://vuejs.org/) - The Progressive JavaScript Framework
- [Nuxt UI](https://ui.nuxt.com/) - UI Components
- [TypeScript](https://www.typescriptlang.org/) - Type Safety
