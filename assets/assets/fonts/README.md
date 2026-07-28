# Fontes Locais

Por padrão, o PULSE BREAK utiliza as seguintes fontes do Google Fonts:
- **Bebas Neue** (para títulos e logos)
- **Orbitron** (para o contador e números)
- **Inter** (para textos gerais)

Caso deseje utilizar fontes locais (para funcionamento offline completo ou personalização), siga os passos abaixo:

## 1. Baixar as fontes
Obtenha os arquivos de fonte (geralmente .woff2, .woff, .ttf) nos sites oficiais ou em repositórios confiáveis.

## 2. Colocar na pasta `assets/fonts/`
Coloque os arquivos dentro desta pasta.

## 3. Atualizar o CSS
No arquivo `style.css`, substitua as regras `@import` ou `@font-face` adicionando:

```css
@font-face {
  font-family: 'Bebas Neue';
  src: url('assets/fonts/bebas-neue.woff2') format('woff2'),
       url('assets/fonts/bebas-neue.woff') format('woff');
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: 'Orbitron';
  src: url('assets/fonts/orbitron.woff2') format('woff2'),
       url('assets/fonts/orbitron.woff') format('woff');
  font-weight: 400 900;
  font-style: normal;
}

@font-face {
  font-family: 'Inter';
  src: url('assets/fonts/inter.woff2') format('woff2'),
       url('assets/fonts/inter.woff') format('woff');
  font-weight: 300 700;
  font-style: normal;
}