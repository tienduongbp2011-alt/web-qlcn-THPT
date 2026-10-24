import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  getWorkspaceStateForUser,
  saveWorkspaceStateForUser,
  appendAuditLog,
} from './src/db/users.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  app.get('/api/workspace', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || 'teacher@thanhhoa.edu.vn';
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const userProfile = await getOrCreateUser(uid, email);
      const state = await getWorkspaceStateForUser(uid);
      res.json({ user: userProfile, state });
    } catch (error: any) {
      console.error('Error in GET /api/workspace:', error);
      res.status(500).json({
        error: error.message || 'Không thể tải dữ liệu từ máy chủ.',
      });
    }
  });

  app.post('/api/workspace', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || 'teacher@thanhhoa.edu.vn';
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      await getOrCreateUser(uid, email);
      const saved = await saveWorkspaceStateForUser(uid, email, req.body.state);
      res.json({ ok: true, updatedAt: saved?.updatedAt });
    } catch (error: any) {
      console.error('Error in POST /api/workspace:', error);
      res.status(500).json({
        error: error.message || 'Không thể lưu dữ liệu lên máy chủ.',
      });
    }
  });

  app.post('/api/audit', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      await appendAuditLog(uid, req.body);
      res.json({ ok: true });
    } catch (error: any) {
      console.error('Error in POST /api/audit:', error);
      res.status(500).json({
        error: error.message || 'Không thể lưu nhật ký hoạt động.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
