# Test Structure

This directory contains all tests for the Enfyra application.

## Directory Structure

- `unit/` - Unit tests for individual functions and components
- `integration/` - Integration tests for component interactions
- `e2e/` - End-to-end tests for complete user workflows
- `fixtures/` - Test data and mock responses
- `helpers/` - Test utilities and helper functions

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run e2e tests only
npm run test:e2e

# Run tests in watch mode
npm run test:watch
```

## Test Guidelines

1. **Unit Tests**: Test individual functions, composables, and component logic
2. **Integration Tests**: Test component interactions and data flow
3. **E2E Tests**: Test complete user workflows and critical paths
4. **Mocking**: Use fixtures for consistent test data
5. **Coverage**: Aim for high coverage on critical business logic