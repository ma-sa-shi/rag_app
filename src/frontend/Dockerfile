FROM node:24-slim

# 以降のコマンドを実行するディレクトリを/appに設定
WORKDIR /app

USER root
# ビルド時間を短縮するため、package.jsonとpackage-lock.jsonを先にコピー
COPY --chown=node:node ./src/frontend/package*.json ./

RUN chown -R node:node /app

# Node公式イメージにあるnodeユーザーにrootから切り替える
USER node

# 依存関係をインストール
RUN npm install

# 3000番ポートの使用を明示
EXPOSE 3000

# サーバーの起動コマンド
CMD ["npm", "run", "dev"]
