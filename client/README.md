# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

# UI组件库

这是一个基于React和Storybook构建的UI组件库，提供了一组可重用的组件，包括按钮、卡片、警告提示、对话框和选择框等。

## 特点

- 📚 完整的组件文档
- 🧪 交互测试集成
- ♿ 可访问性合规
- 🔄 持续集成流程
- 🎨 主题定制支持

## 安装

```bash
# 安装项目依赖
npm install
```

## 开发

### 启动Storybook开发环境

```bash
npm run storybook
```

这将在开发模式下启动Storybook，通常在 http://localhost:6006 访问。

### 构建Storybook静态文件

```bash
npm run build-storybook
```

构建后的文件将位于`storybook-static`目录中。

### 运行Storybook测试

```bash
# 先构建Storybook
npm run build-storybook

# 然后运行测试
npm run test-storybook

# 或者使用CI测试命令（包含启动服务器和运行测试）
npm run ci-test-storybook
```

## 组件列表

项目包含以下核心组件：

- **Button** - 按钮组件，支持多种变体和大小
- **Card** - 卡片容器组件
- **Alert** - 警告提示组件
- **Dialog** - 对话框组件
- **Select** - 选择框组件

每个组件都有详细的文档和使用示例。

## 开发指南

### 添加新组件

1. 在`src/components/ui`目录下创建组件文件
2. 创建相应的故事文件（`.stories.tsx`）
3. 添加交互测试
4. 更新文档

### 交互测试

交互测试使用Storybook的Play函数实现，示例：

```tsx
export const Default: Story = {
  render: () => <Button>点击我</Button>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /点击我/i });
    await userEvent.click(button);
    // 添加断言检查按钮行为
  }
};
```

## CI/CD流程

项目使用GitHub Actions进行持续集成和部署：

- 每次提交或PR时自动构建和测试Storybook
- 合并到主分支时自动部署到GitHub Pages
- 测试结果以JUnit格式保存并上传为工作流构件

## 贡献指南

1. Fork项目并克隆到本地
2. 创建新的特性分支
3. 提交更改并推送到你的Fork
4. 创建Pull Request

请确保所有组件都有相应的故事和测试。

## 许可证

ISC许可证
