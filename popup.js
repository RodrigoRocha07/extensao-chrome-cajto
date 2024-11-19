function verificarLogin() {
    chrome.storage.sync.get(["loggedIn", "username", "scriptAtivado"], function(result) {
        if (result.loggedIn === true) {
            document.getElementById("login-form").style.display = "none";
            document.getElementById("logout-section").style.display = "block";
            document.getElementById("ativar-script").checked = result.scriptAtivado === true;
            
            if (result.scriptAtivado === true) {
                document.getElementById("script-status").textContent = "Script ativado!";
                document.getElementById("script-status").style.color = "green";
                injectContentScript();
            } else {
                document.getElementById("script-status").textContent = "Script desativado.";
                document.getElementById("script-status").style.color = "red";
            }

            verificarUsuarioPeriodicamente(result.username);
        } else {
            document.getElementById("login-form").style.display = "block";
            document.getElementById("logout-section").style.display = "none";
        }
    });
}

function verificarUsuarioPeriodicamente(username) {
    const intervaloVerificacao = 1 * 60 * 1e3; // 1 minuto

    async function verificarUsuario() {
        try {
            console.log(`Verificando existência do usuário: ${username}`);
            const response = await fetch("https://extensao-chrome.squareweb.app/usuario/existe", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({username: username})
            });
            const data = await response.json();
            console.log("Resposta do servidor:", data);

            if (!data.existe) {
                console.log("Usuário removido. Forçando logout.");
                forcarLogout();
            } else {
                console.log("Usuário ainda existe.");
            }
        } catch (error) {
            console.error("Erro ao verificar usuário:", error);
        }
    }

    verificarUsuario();
    setInterval(verificarUsuario, intervaloVerificacao);
}

function forcarLogout() {
    limparLocalStorage();
    chrome.storage.sync.set({loggedIn: false, scriptAtivado: false}, function() {
        document.getElementById("message").textContent = "Você foi desconectado. Usuário não encontrado no banco de dados.";
        document.getElementById("message").style.color = "red";

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.reload(tabs[0].id);
        });

        verificarLogin();
    });
}

verificarLogin();

document.getElementById("login-form").addEventListener("submit", async function(event) {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("http://localhost:5000/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username: username, password: password})
        });
        const data = await response.json();

        if (response.ok) {
            document.getElementById("message").textContent = "Login realizado com sucesso!";
            document.getElementById("message").style.color = "green";
            chrome.storage.sync.set({loggedIn: true, username: username, scriptAtivado: false}, function() {
                verificarLogin();
            });
        } else {
            document.getElementById("message").textContent = "Erro: " + data.message;
            document.getElementById("message").style.color = "red";
        }
    } catch (error) {
        document.getElementById("message").textContent = "Erro de conexão";
        document.getElementById("message").style.color = "red";
    }
});

function injectContentScript() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ["inject.js", "content.js"]
        }, () => {
            console.log("Scripts de conteúdo injetados na página ativa.");
        });
    });
}

function limparLocalStorage() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            func: function() {
                localStorage.clear();
                console.log("LocalStorage limpo após a desativação do script.");
            }
        });
    });
}

document.getElementById("ativar-script").addEventListener("change", function() {
    const ativado = this.checked;
    chrome.storage.sync.set({scriptAtivado: ativado}, function() {
        if (ativado) {
            injectContentScript();
        } else {
            limparLocalStorage();
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.reload(tabs[0].id);
            });
        }
    });
});

document.getElementById("logout").addEventListener("click", function() {
    limparLocalStorage();
    chrome.storage.sync.set({loggedIn: false, scriptAtivado: false}, function() {
        document.getElementById("message").textContent = "Usuário deslogado com sucesso";
        document.getElementById("message").style.color = "green";
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.reload(tabs[0].id);
        });
        verificarLogin();
    });
});

document.getElementById("grafico-button").addEventListener("click", function() {
    const valorDigitado = prompt("Digite o valor em R$ para gerar o gráfico (ex: 287.699,15):");
    const valorFormatado = valorDigitado.replace(/\./g, "").replace(",", ".");
    const valorVendas = parseFloat(valorFormatado);

    if (!isNaN(valorVendas) && valorVendas > 0) {
        const valorVendasFormatado = valorVendas.toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2});
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                func: (valor, valorFormatado) => {
                    localStorage.setItem("valorVendas", valorFormatado);
                    localStorage.setItem("serieVendas", JSON.stringify(gerarSerieDeVendas(valor)));
                    alert(`Gráfico será gerado para o valor de R$ ${valorFormatado}`);
                },
                args: [valorVendas, valorVendasFormatado]
            }, () => {
                console.log("Valor de vendas enviado para gerar o gráfico:", valorVendasFormatado);
            });
        });
    } else {
        alert("Por favor, insira um valor válido em R$.");    
    }
});
