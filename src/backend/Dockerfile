FROM python:3.13-slim

WORKDIR /app

USER root

# build-essentialはC言語のコンパイルに必要なパッケージ
# default-libmysqlclient-devはMySQLと接続するためのパッケージmysqlclient
# をインストールするために必要なパッケージ
# pkg-configはC言語のコンパイラにパッケージを認識させるためのツールで
# mysqlclientのインストールに必要
# curlはPoetryのインストールに必要なツール
# イメージサイズを小さくするため、インストール後にキャッシュを削除
RUN apt-get update && apt-get install -y \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ファイルの所有者をホストとコンテナで同じにするため、ホストの初期ユーザーと同じUIDとGIDを設定
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# ユーザーとグループを作成し、ユーザー"vscode"にroot権限を付与
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m -s /bin/bash $USERNAME \
    && mkdir -p /etc/sudoers.d \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Poetryのインストール場所を環境変数で指定
ENV POETRY_HOME="/opt/poetry"

# Poetryをインストール
RUN curl -sSL https://install.python-poetry.org | python3 -

# コマンド"Poetry"でPoetryを実行できるように、環境変数PATHにPoetryのインストール場所を追加
ENV PATH="$POETRY_HOME/bin:$PATH"

RUN chown -R $USERNAME:$USER_GID $POETRY_HOME

COPY src/backend/pyproject.toml src/backend/poetry.lock* ./

RUN chown -R $USERNAME:$USER_GID /app

# コンテナの共通にPoetryでライブラリをインストールするため、仮想環境を作成しないように設定

USER $USERNAME
