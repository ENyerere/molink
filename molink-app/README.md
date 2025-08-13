# molink-app

一个基于 React + Vite + Slate + Tailwind CSS 的轻量级页面编辑器项目。

## 项目特性

- **React**：构建现代化前端界面。
- **Slate**：富文本编辑器，支持复杂内容编辑。
- **Tailwind CSS**：原子化 CSS，快速样式开发。
- **Vite**：极速开发与构建工具。
- **TypeScript**：类型安全，提升开发体验。

## 快速开始

1. **安装依赖**

   ```shell
   yarn install
   ```

2. **启动开发服务器**

   ```shell
   yarn dev
   ```

## 目录结构

```
molink-app/
├── src/                # 源码目录
│   ├── App.tsx         # 应用主入口
│   ├── Editor.tsx      # 编辑器组件
│   └── ...             # 其他组件和文件
├── public/             # 静态资源
├── postcss.config.js   # PostCSS 配置
├── tailwind.config.js  # Tailwind CSS 配置
├── package.json        # 项目配置
└── README.md           # 项目说明
```

## 主要依赖

- [React](https://react.dev/)
- [Slate](https://docs.slatejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## PostCSS 配置说明

项目使用 ES Module 格式的 PostCSS 配置：

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## 常见问题

- **Tailwind CSS 报错**  
  请确保使用的是 Tailwind CSS v3.x，并已正确安装依赖。

- **依赖安装失败或启动异常**  
  可尝试清理缓存并重新安装依赖：
  ```shell
  yarn cache clean
  rm -rf node_modules .vite
  yarn install
  ```

## 许可证
