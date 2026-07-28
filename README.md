# PULSE BREAK

**Professional Standing Reminder**

Pulse Break é um Progressive Web App (PWA) desenvolvido para lembrar você de se levantar da cadeira periodicamente durante o trabalho. Com circuitos personalizáveis, alertas visuais e sonoros, ele ajuda a manter uma rotina saudável.

## Recursos

- **Circuitos personalizados**: defina tempos de trabalho em minutos (ex: 20, 30, 20, 40) que se repetem em loop.
- **Pausa programável**: duração da pausa em segundos (padrão 120s).
- **Alerta fullscreen**: tela preta com animação neon e texto "LEVANTE-SE" que pisca, desaparecendo automaticamente.
- **Notificações**: envia notificações push quando disponível.
- **Vibração**: compatível com dispositivos que suportam a API Vibration.
- **Som**: alarme gerado via Web Audio API.
- **Wake Lock**: mantém a tela ativa durante o timer (quando suportado).
- **Totalmente offline**: graças ao Service Worker, funciona sem internet.
- **Design cyberpunk-minimalista**: glassmorphism, glow neon, tipografia futurista.
- **Responsivo**: adapta-se a desktop, tablet, celular e telas 4K.

## Arquitetura

O projeto segue uma arquitetura **client-side pura**, sem dependências externas, frameworks ou backend. Todos os dados são mantidos em memória e a configuração é carregada a partir de um arquivo `config.json`. Não utiliza `localStorage` nem bancos de dados – a persistência é intencionalmente mínima, focando na simplicidade.

- **HTML5**: estrutura semântica e acessível.
- **CSS3**: estilos modulares com animações CSS e design responsivo.
- **JavaScript ES6+**: lógica de temporização, gerenciamento de estado e integração com APIs nativas.
- **Manifest PWA**: configuração para instalação e execução como aplicativo standalone.
- **Service Worker**: cache de assets, suporte offline e notificações.

## Estrutura de Arquivos
pulse-break/
├── index.html
├── style.css
├── app.js
├── config.json
├── manifest.json
├── sw.js
├── offline.html
├── generate-icons.html (ferramenta para gerar ícones)
├── .gitignore
├── LICENSE
├── README.md
├── assets/
│ ├── icons/
│ │ ├── icon.svg
│ │ ├── icon-192.png (gerado a partir do SVG)
│ │ ├── icon-256.png (gerado)
│ │ ├── icon-384.png (gerado)
│ │ └── icon-512.png (gerado)
│ ├── fonts/ (opcional, fontes locais)
│ └── sounds/ (opcional, arquivos de som)
└── docs/ (opcional, documentação)

text

## Como Instalar

1. Clone ou baixe todos os arquivos para uma pasta.
2. Certifique-se de que a estrutura de pastas seja mantida.
3. **Gere os ícones PNG** utilizando o arquivo `generate-icons.html` (abra no navegador e clique nos botões para baixar cada tamanho). Coloque os arquivos gerados em `assets/icons/`.
4. Sirva os arquivos com um servidor HTTP local (ex: `python -m http.server 8000`, `npx serve`, ou VS Code Live Server).
5. Acesse via navegador (Chrome, Edge, Firefox, etc.).

## Como Executar

- Abra o `index.html` em um navegador moderno.
- O aplicativo carregará a configuração padrão e iniciará com o primeiro ciclo.
- Use os botões **START**, **STOP** e **RESET** para controlar o timer.
- Clique em **CONFIGURAÇÃO** para ajustar os circuitos, pausa, alerta e opções.

## Como Transformar em PWA

O projeto já é um PWA completo. Para instalar no dispositivo:

- **Desktop (Chrome/Edge)**: clique no ícone de instalação na barra de endereço ou no menu "Instalar aplicativo".
- **Mobile (Android)**: abra no Chrome e toque em "Adicionar à tela inicial".
- **iOS (Safari)**: use o botão "Compartilhar" e selecione "Adicionar à tela inicial".

Certifique-se de que o Service Worker esteja registrado (verifique no console do desenvolvedor).

## Como Gerar os Ícones PNG

O arquivo `generate-icons.html` é uma ferramenta que converte o `icon.svg` em PNG nos tamanhos 192, 256, 384 e 512 pixels.

1. Abra `generate-icons.html` em qualquer navegador moderno.
2. Clique em cada botão "Baixar ..." para salvar os arquivos.
3. Coloque-os em `assets/icons/`.

Alternativamente, você pode usar ferramentas online ou editores de imagem para converter o SVG.

## Como Alterar o JSON

Edite o arquivo `config.json` na raiz:

```json
{
    "cycles": [20, 30, 20, 40],      // tempos de trabalho em minutos
    "pauseDuration": 120,            // pausa em segundos
    "fullscreenAlert": 10,           // duração do alerta fullscreen em segundos
    "loop": true,                    // repetir circuitos infinitamente
    "sound": true,                   // habilitar som
    "vibration": true                // habilitar vibração
}
Após alterar, recarregue a página (ou reinicie o PWA) para aplicar as mudanças.

Como Adicionar Novos Circuitos
Através da interface de configuração:

Clique em CONFIGURAÇÃO.

Na seção "Circuitos", insira um valor em minutos no campo e clique em "Adicionar".

Para remover, clique no ✕ ao lado do ciclo.

Para editar, remova e adicione novamente com o valor desejado.

Alternativamente, edite o config.json diretamente.

Como Alterar Sons
O som é gerado programaticamente via Web Audio API. Para modificar o tom ou padrão, edite a função playAlarmSound() em app.js (linhas ~300-350). Você pode substituir por arquivos de áudio (<audio> ou AudioContext com buffers) se preferir.

Como Alterar Cores
As cores principais estão definidas no style.css:

Fundo: #050505

Painéis: #101010

Primário (ciano): #00F5FF

Secundário (azul): #00A3FF

Texto: #FFFFFF

Alerta (vermelho): #FF0044

Para mudar, basta substituir essas cores em todo o arquivo CSS (use "localizar e substituir").

Como Alterar Fontes
As fontes são carregadas do Google Fonts:

Bebas Neue (títulos)

Orbitron (contador)

Inter (textos gerais)

Para trocar, edite a tag <link> no index.html e atualize as propriedades font-family no style.css.

Compatibilidade
Navegadores: Chrome, Edge, Firefox, Safari (versões recentes).

Dispositivos: Desktop, notebooks, tablets, smartphones.

APIs utilizadas:

Service Worker

Web Audio API

Notification API

Vibration API

Wake Lock API

Fullscreen API

Fetch API

Cache API

Todas as APIs são verificadas e degradam graciosamente quando não suportadas.

PWABuilder e Validação
Este projeto foi otimizado para atender aos requisitos do PWABuilder:

Manifest completo: com id, scope, display_override, shortcuts, screenshots e ícones em múltiplos tamanhos.

Service Worker robusto: com cache versionado, fallback offline e atualização automática.

Ícones: PNGs nos tamanhos 192, 256, 384 e 512, além do SVG como fallback.

Segurança: CSP, Política de Referrer e Permissions Policy configuradas.

SEO: meta tags, Open Graph e Twitter Cards para melhor compartilhamento.

Boas Práticas
Código limpo, sem dependências externas.

Separação clara entre HTML, CSS e JS.

Animações suaves e não intrusivas.

Acessibilidade básica (labels, roles, etc.).

Design responsivo testado em múltiplos tamanhos.

Uso de preconnect e preload para otimização de fontes.

Licença
Este projeto é distribuído sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

Roadmap Futuro
□ Suporte a múltiplos idiomas (i18n).
□ Histórico de estatísticas (tempo sentado, pausas realizadas).
□ Sincronização com calendário ou tarefas.
□ Temas adicionais (claro/escuro).
□ Integração com wearable devices (via Web Bluetooth).
□ Backup/restore de configurações via arquivo.
□ Testes automatizados (Jest, Cypress).
□ Melhor suporte a acessibilidade (ARIA).
Desenvolvido com ❤️ para uma vida mais saudável.


---

### 3. .gitignore

**Localização**: Raiz do projeto  
**Ação**: Substituir integralmente o arquivo existente.

```gitignore
# Arquivos de sistema
.DS_Store
Thumbs.db
desktop.ini

# Arquivos de editor
.vscode/
.idea/
*.sublime-*
*.iml

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Dependências (caso use npm futuramente)
node_modules/
package-lock.json
yarn.lock

# Arquivos temporários
*.tmp
*.temp
*.cache

# Arquivos de build (não temos)
dist/
build/
out/

# Arquivos de ambiente
.env
.env.local
.env.*.local

# Ícones gerados (não versionar, pois são derivados do SVG)
assets/icons/*.png

# Screenshots (opcional)
assets/screenshots/

# Arquivos de áudio grandes (opcional)
*.mp3
*.wav
*.ogg
*.flac

# Fontes locais (opcional, se forem grandes)
*.ttf
*.otf
*.woff
*.woff2

# Mantenha os arquivos essenciais (exceto os gerados)
!*.md
!*.json
!*.html
!*.css
!*.js
!*.svg
!LICENSE
!*.ico