# VMS driver portal

Mobile-first driver site. Talks only to the backend API.

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:3000. Requests to `/api/v1` are proxied to https://vms-backend-1rnk.onrender.com. Set `API_ORIGIN` to use a different backend, for example `http://localhost:5000`.
