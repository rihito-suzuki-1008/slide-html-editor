// slide-editor-server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

// プロジェクトのベースディレクトリ
const BASE_DIR = process.cwd();
let currentProjectPath = null;

// ミドルウェア設定
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// 静的ファイルの提供（エディター自体のファイル）
app.use('/editor', express.static(path.join(BASE_DIR, 'editor')));

// ルートディレクトリの静的ファイル（slide_all_display.html）を提供
app.use(express.static(BASE_DIR, {
    index: false,  // index.htmlの自動提供を無効化
    extensions: ['html']  // .htmlファイルを許可
}));

// プレビュー用のルート
app.get('/preview/:file', (req, res, next) => {
    if (!currentProjectPath) {
        return res.status(404).send('プロジェクトが選択されていません');
    }
    
    const file = req.params.file;
    
    // slide_all_display.htmlの場合は、プロジェクトディレクトリからではなくルートから提供
    if (file === 'slide_all_display.html') {
        return res.sendFile(path.join(BASE_DIR, file));
    }
    
    // その他のファイル（スライドファイル）は現在のプロジェクトから提供
    const filePath = path.join(currentProjectPath, file);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send('ファイルが見つかりません');
        }
    });
});

// プロジェクト一覧を取得
app.get('/api/projects', async (req, res) => {
    try {
        console.log('プロジェクト一覧を取得中...', BASE_DIR);
        const entries = await fs.readdir(BASE_DIR, { withFileTypes: true });
        const projects = [];
        
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'editor') {
                const projectPath = path.join(BASE_DIR, entry.name);
                console.log('チェック中のディレクトリ:', entry.name);
                
                try {
                    // スライドファイルがあるかチェック
                    const files = await fs.readdir(projectPath);
                    const slideFiles = files.filter(file => file.match(/^slide-\d{2}\.html$/));
                    const hasSlides = slideFiles.length > 0;
                    
                    console.log(`  - スライドファイル数: ${slideFiles.length}`);
                    
                    if (hasSlides) {
                        const stats = await fs.stat(projectPath);
                        projects.push({
                            name: entry.name,
                            path: entry.name,
                            slideCount: slideFiles.length,
                            lastModified: stats.mtime
                        });
                        console.log(`  ✓ プロジェクトとして追加`);
                    }
                } catch (err) {
                    console.log(`  ✗ エラー: ${err.message}`);
                }
            }
        }
        
        console.log(`見つかったプロジェクト数: ${projects.length}`);
        res.json({ projects: projects.sort((a, b) => b.lastModified - a.lastModified) });
    } catch (error) {
        console.error('プロジェクト一覧の取得エラー:', error);
        res.status(500).json({ error: 'プロジェクト一覧の取得に失敗しました' });
    }
});

// プロジェクトを選択
app.post('/api/projects/select', (req, res) => {
    const { projectPath } = req.body;
    currentProjectPath = path.join(BASE_DIR, projectPath);
    res.json({ success: true, message: 'プロジェクトを選択しました' });
});

// 新規プロジェクトを作成
app.post('/api/projects/create', async (req, res) => {
    try {
        const { projectName } = req.body;
        const projectPath = path.join(BASE_DIR, projectName);
        
        // ディレクトリを作成
        await fs.mkdir(projectPath, { recursive: true });
        
        // サンプルスライドを作成
        const sampleSlide = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>スライド 1</title>
    <style>
        .slide {
            width: 1024px;
            height: 768px;
            padding: 40px;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        h1 { font-size: 48px; margin-bottom: 30px; }
        p { font-size: 24px; line-height: 1.5; }
        @media print{@page{margin:0;size:landscape;} .slide{page-break-after:always;}}
    </style>
</head>
<body>
    <div class="slide">
        <h1>新規プロジェクト</h1>
        <p>スライドを編集してください</p>
    </div>
</body>
</html>`;
        
        await fs.writeFile(path.join(projectPath, 'slide-01.html'), sampleSlide);
        
        res.json({ success: true, message: 'プロジェクトを作成しました' });
    } catch (error) {
        res.status(500).json({ error: 'プロジェクトの作成に失敗しました' });
    }
});

// スライド一覧を取得
app.get('/api/slides', async (req, res) => {
    if (!currentProjectPath) {
        return res.status(400).json({ error: 'プロジェクトが選択されていません' });
    }
    
    try {
        const files = await fs.readdir(currentProjectPath);
        const slideFiles = files
            .filter(file => file.match(/^slide-\d{2}\.html$/))
            .sort();
        
        res.json({ slides: slideFiles });
    } catch (error) {
        res.status(500).json({ error: 'スライド一覧の取得に失敗しました' });
    }
});

// 特定のスライドの内容を取得
app.get('/api/slides/:filename', async (req, res) => {
    if (!currentProjectPath) {
        return res.status(400).json({ error: 'プロジェクトが選択されていません' });
    }
    
    try {
        const filename = req.params.filename;
        const content = await fs.readFile(path.join(currentProjectPath, filename), 'utf8');
        res.json({ content });
    } catch (error) {
        res.status(404).json({ error: 'スライドが見つかりません' });
    }
});

// 新規スライドを作成
app.post('/api/slides/create', async (req, res) => {
    if (!currentProjectPath) {
        return res.status(400).json({ error: 'プロジェクトが選択されていません' });
    }
    
    try {
        const { filename, content } = req.body;
        
        if (!filename || !content) {
            return res.status(400).json({ error: 'ファイル名とコンテンツが必要です' });
        }
        
        // ファイル名の検証
        if (!filename.match(/^slide-\d{2}\.html$/)) {
            return res.status(400).json({ error: '無効なファイル名です' });
        }
        
        const filePath = path.join(currentProjectPath, filename);
        
        // ファイルが既に存在するかチェック
        try {
            await fs.access(filePath);
            return res.status(400).json({ error: 'ファイルが既に存在します' });
        } catch (e) {
            // ファイルが存在しない場合は正常
        }
        
        // スライドを作成
        await fs.writeFile(filePath, content, 'utf8');
        
        res.json({ success: true, message: 'スライドを作成しました' });
    } catch (error) {
        console.error('スライド作成エラー:', error);
        res.status(500).json({ error: 'スライドの作成に失敗しました' });
    }
});

// スライドの内容を保存
app.put('/api/slides/:filename', async (req, res) => {
    if (!currentProjectPath) {
        return res.status(400).json({ error: 'プロジェクトが選択されていません' });
    }
    
    try {
        const filename = req.params.filename;
        const { content } = req.body;
        const filePath = path.join(currentProjectPath, filename);
        
        // バックアップを作成
        const backupDir = path.join(currentProjectPath, 'backups');
        try {
            await fs.mkdir(backupDir, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `${filename}.${timestamp}.bak`);
            const originalContent = await fs.readFile(filePath, 'utf8');
            await fs.writeFile(backupPath, originalContent);
        } catch (e) {
            console.log('バックアップ作成をスキップ:', e.message);
        }
        
        // ファイルを更新
        await fs.writeFile(filePath, content, 'utf8');
        res.json({ success: true, message: 'スライドを保存しました' });
    } catch (error) {
        res.status(500).json({ error: 'スライドの保存に失敗しました' });
    }
});

// スライドを削除
app.delete('/api/slides/:filename', async (req, res) => {
    if (!currentProjectPath) {
        return res.status(400).json({ error: 'プロジェクトが選択されていません' });
    }
    
    try {
        const filename = req.params.filename;
        const filePath = path.join(currentProjectPath, filename);
        
        // ファイルの存在をチェック
        try {
            await fs.access(filePath);
        } catch (e) {
            return res.status(404).json({ error: 'ファイルが見つかりません' });
        }
        
        // バックアップを作成してから削除
        const backupDir = path.join(currentProjectPath, 'backups');
        try {
            await fs.mkdir(backupDir, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `${filename}.deleted.${timestamp}.bak`);
            const originalContent = await fs.readFile(filePath, 'utf8');
            await fs.writeFile(backupPath, originalContent);
        } catch (e) {
            console.log('削除前バックアップ作成をスキップ:', e.message);
        }
        
        // ファイルを削除
        await fs.unlink(filePath);
        
        res.json({ success: true, message: 'スライドを削除しました' });
    } catch (error) {
        console.error('スライド削除エラー:', error);
        res.status(500).json({ error: 'スライドの削除に失敗しました' });
    }
});

// スライドの順番を変更（リネーム）
app.post('/api/slides/reorder', async (req, res) => {
    if (!currentProjectPath) {
        return res.status(400).json({ error: 'プロジェクトが選択されていません' });
    }
    
    try {
        const { oldFilename, newFilename } = req.body;
        
        if (!oldFilename || !newFilename) {
            return res.status(400).json({ error: '旧ファイル名と新ファイル名が必要です' });
        }
        
        const oldPath = path.join(currentProjectPath, oldFilename);
        const newPath = path.join(currentProjectPath, newFilename);
        
        // ファイルの存在をチェック
        try {
            await fs.access(oldPath);
        } catch (e) {
            return res.status(404).json({ error: '元のファイルが見つかりません' });
        }
        
        // 新しいファイル名が既に存在するかチェック
        try {
            await fs.access(newPath);
            return res.status(400).json({ error: '新しいファイル名は既に存在します' });
        } catch (e) {
            // 新しいファイル名が存在しない場合は正常
        }
        
        // ファイルをリネーム
        await fs.rename(oldPath, newPath);
        
        res.json({ success: true, message: 'スライドの順番を変更しました' });
    } catch (error) {
        console.error('スライド順番変更エラー:', error);
        res.status(500).json({ error: 'スライドの順番変更に失敗しました' });
    }
});

// 現在のプロジェクト情報を取得
app.get('/api/current-project', (req, res) => {
    if (currentProjectPath) {
        res.json({ 
            projectPath: path.relative(BASE_DIR, currentProjectPath),
            projectName: path.basename(currentProjectPath)
        });
    } else {
        res.status(404).json({ error: 'プロジェクトが選択されていません' });
    }
});

// ホームページリダイレクト
app.get('/', (req, res) => {
    res.redirect('/editor/');
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║          スライド編集サーバー起動完了          ║
╠══════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}/editor/            ║
║                                              ║
║  🆕 新機能が追加されました：                  ║
║  • HTMLソースエディター                      ║
║  • 新規スライド作成（テンプレート付き）       ║
║  • スライド削除機能                          ║
║  • HTMLペースト機能                          ║
║                                              ║
║  1. ブラウザで上記URLを開いてください        ║
║  2. プロジェクトを選択または作成します        ║
║  3. ➕ 新規スライドボタンでスライド追加      ║
║  4. 🗂️ HTML編集でソースコード直接編集       ║
║                                              ║
║  終了: Ctrl+C                                ║
╚══════════════════════════════════════════════╝
    `);
});