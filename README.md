# docker command

```
# 開発時
docker compose -f compose.dev.yaml up -d  # DBだけ起動
npm run dev  # アプリはローカル

# 本番時
docker compose up -d  # 全部Dockerで起動
```
