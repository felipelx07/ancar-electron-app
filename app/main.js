const {app, BrowserWindow, ipcMain} = require('electron');
const { net } = require('electron')

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        port: 3050,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    win.loadFile('app\\login.html');

    // routes
    ipcMain.on('login-data', async (event, cpf, senha) => {
        const response = await doLogin(cpf, senha);
        const data = await response.json();
        event.sender.send('save-token-in-local-storage', data.access_token);
        event.reply('login-response', response.ok, response.ok ? '' : 'Login inválido');
    });

    ipcMain.on('open-questionario-page', () => {
        win.loadFile('app\\questionario.html');
    });

    ipcMain.on('listar-questionarios', async (event) => {
        const response = await net.fetch('http://localhost:4000/api/questionarios')
        if (response.ok) {
            const data = await response.json()
            event.reply('carregar-listar-html', data);
        }
    });

    ipcMain.on('open-questionario', (event, questionnaireId) => {
        win.loadFile('app\\resposta.html', {
            query: {
                questionnaireId,
            },
        });
    });

    ipcMain.on('get-questionario-info', async (event, id) => {
        const response = await net.fetch(`http://localhost:4000/api/questionarios/${id}`)
        if (response.ok) {
            const data = await response.json()
            event.reply('load-questionario-info-html', data);
        }
    });

    ipcMain.on('get-resposta-info', async (event, idQuestionario) => {
        const response = await net.fetch(`http://localhost:4000/api/questionarios/${idQuestionario}/respostas`)
        if (response.ok) {
            const data = await response.json()
            event.reply('load-resposta-info-html',idQuestionario, data);
        }
    });

    ipcMain.on('save-resposta', async (event, id, respostas, token) => {
        const response = await Promise.all(respostas.map(async resposta => {
            await net.fetch(`http://localhost:4000/api/questionarios/${id}/respostas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(resposta),
            })
        }))

        event.reply('save-response', true, 'Respostas salvas com sucesso!');
    });
}

async function doLogin(cpf, senha) {
    const data = {cpf: cpf, senha: senha}
    return await net.fetch('http://localhost:4000/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});