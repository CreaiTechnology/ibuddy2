# Contributing to ibuddy2

Thank you for your interest in contributing to ibuddy2! This document provides guidelines and instructions for contributing to this microservices project.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to maintain a welcoming and inclusive environment for everyone.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git
- Docker (recommended for local development)

### Development Environment Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```
   git clone https://github.com/YOUR-USERNAME/ibuddy2.git
   cd ibuddy2
   ```
3. Add the original repository as an upstream remote:
   ```
   git remote add upstream https://github.com/original-owner/ibuddy2.git
   ```
4. Install dependencies for each service:
   ```
   cd api-gateway && npm install
   cd ../core-service && npm install
   cd ../ai-service && npm install
   cd ../client && npm install
   ```
5. Create `.env` files in each service directory (use the `env.example` files as templates)
6. Start the services as described in the main README

## Development Workflow

### Branching Strategy

We follow a simplified Git Flow branching model:

- `main` - Contains production-ready code
- `develop` - Main development branch
- `feature/*` - For new features
- `bugfix/*` - For bug fixes
- `release/*` - For preparing releases
- `hotfix/*` - For critical production fixes

### Pull Request Process

1. Create a new branch from `develop` for your work
2. Make your changes, following our coding standards
3. Write or update tests as necessary
4. Ensure all tests pass and the build is successful
5. Update documentation if needed
6. Submit a pull request to the `develop` branch
7. Address any feedback from code reviews

## Coding Standards

### JavaScript/Node.js

- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use ES6+ features when appropriate
- Document your code with JSDoc comments
- Maximum line length of 100 characters
- Use meaningful variable and function names

### React

- Use functional components with hooks
- Follow component organization patterns described in `/docs/architecture.md`
- Use TypeScript for type safety
- Follow the [React TypeScript Cheatsheet](https://github.com/typescript-cheatsheets/react)

### API Design

- Follow RESTful principles
- Use consistent naming conventions
- Version APIs appropriately
- Document all endpoints using OpenAPI/Swagger

### Testing

- Write unit tests for all new features
- Aim for good test coverage, especially for critical paths
- Integration tests for service interactions
- End-to-end tests for critical user flows

## Microservices Architecture

Each service should:

- Be independently deployable
- Have a well-defined API
- Store service-specific data
- Be responsible for a specific domain
- Follow the single responsibility principle

### Service Communication

- Use HTTP/REST for synchronous communication
- Use message queues (RabbitMQ) for asynchronous communication
- Document all inter-service communication patterns

## Submitting Changes

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types include:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Pull Request Template

When creating a pull request, please use the provided template and ensure:

1. The PR has a clear description of changes
2. All automated tests pass
3. Documentation is updated (if necessary)
4. The PR links to related issues (if any)
5. The code follows our style guidelines

## Documentation

- Update README files when changing functionality
- Document all APIs using OpenAPI/Swagger
- Keep architecture diagrams up to date
- Update the roadmap when appropriate

## Questions and Support

If you have questions or need help, please:

1. Check existing GitHub issues
2. Create a new GitHub issue if needed
3. Contact the project maintainers via email

## Acknowledgments

- Thank you to all contributors who help improve this project
- Special thanks to early adopters and testers

---

These guidelines are not set in stone and may evolve over time. Suggestions for improvements to this document are welcome! 