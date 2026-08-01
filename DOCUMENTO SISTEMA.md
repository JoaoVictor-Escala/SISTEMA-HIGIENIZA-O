# 📚 Stack de UI/UX e Componentes de Interface

Este documento mapeia as bibliotecas, frameworks e repositórios de design aprovados para o desenvolvimento de novas interfaces, variando de landing pages de alta conversão a dashboards de gestão complexos.

Abaixo, as ferramentas estão categorizadas de acordo com o ecossistema tecnológico e seu principal caso de uso para facilitar a decisão arquitetural de cada novo projeto.

---

## ⚛️ Ecossistema React & Next.js
*Ideal para aplicações altamente interativas, landing pages modernas e micro-SaaS com foco em apelo visual e animações.*

* **[HeroUI](https://heroui.com/docs/react/components)**
    * **Descrição:** Biblioteca de componentes base (inputs, modais, botões) com design limpo e moderno.
    * **Caso de Uso:** Fundação para formulários, fluxos de checkout e interfaces de usuário do dia a dia.
* **[Magic UI](https://magicui.design/docs/components)**
    * **Descrição:** Focada em animações e componentes visuais de alto impacto (grids animados, efeitos de texto, backgrounds dinâmicos).
    * **Caso de Uso:** Seções "Hero" de landing pages, páginas de vendas e apresentações de produtos SaaS.
* **[Fancy Components](https://www.fancycomponents.dev/docs/components/image/image-trail)**
    * **Descrição:** Coleção de micro-interações criativas (ex: *image-trail* interativo).
    * **Caso de Uso:** Gatilhos visuais específicos para reter a atenção do usuário na página e melhorar a experiência de navegação.

---

## 💚 Ecossistema Vue.js & Nuxt
*Excelente para velocidade de desenvolvimento, painéis administrativos escaláveis e sistemas robustos de gestão interna.*

* **[Nuxt UI](https://ui.nuxt.com/docs/getting-started)**
    * **Descrição:** Biblioteca nativa para Nuxt, totalmente integrada ao Tailwind CSS, oferecendo componentes extremamente rápidos e customizáveis.
    * **Caso de Uso:** Estruturação rápida de front-ends para plataformas SaaS e aplicativos web completos.
* **[PrimeVue](http://primevue.org/uikit/guide/v3/)**
    * **Descrição:** Um dos pacotes mais completos do mercado, recheado de componentes complexos.
    * **Caso de Uso:** Essencial para dashboards que necessitam de tabelas de dados ricas (DataTables com filtros avançados), gráficos de performance e calendários de gestão.

---

## 🎨 Design System e Blocos Visuais
*Ferramentas agnósticas de framework, voltadas para a estruturação de classes Tailwind e blocos de construção rápidos.*

* **[Square UI (LNDev)](https://square.lndevui.com/)**
    * **Descrição:** Componentes estilizados e minimalistas focados em uma estética moderna.
    * **Caso de Uso:** Construção de painéis e interfaces que exigem um visual mais "limpo" e direto.
* **[Solace UI](https://www.solaceui.com/components)**
    * **Descrição:** Biblioteca de blocos e layouts prontos.
    * **Caso de Uso:** Acelerar a prototipagem de novas telas sem precisar escrever CSS do zero.

---

## 🧠 Pesquisa e Arquitetura de Conversão (UX)

* **[Mobbin](https://mobbin.com/)**
    * **Descrição:** O maior dicionário visual do mundo de aplicativos e produtos digitais reais que já estão validados no mercado.
    * **Caso de Uso:** Antes de codar ou desenhar qualquer fluxo, usar o Mobbin para mapear como os grandes players do mercado resolvem problemas de UX (ex: como é a tela de onboarding de um app financeiro ou o carrinho de um e-commerce gigante).

---

## 🛠️ Como utilizar esta documentação nas decisões técnicas

1.  **Defina o Escopo:** É um sistema de gestão interno ou uma página para tráfego pago e captura de leads?
2.  **Escolha o Core:** * Se for **Gestão/Dados**, a base será `Vue/Nuxt + Nuxt UI` (adicionando `PrimeVue` se houver muitas tabelas).
    * Se for **Vendas/SaaS**, a base será `React/Next.js + HeroUI` (adicionando `Magic UI` para o fator "UAU").
3.  **Prototipagem:** Sempre validar o fluxo no `Mobbin` antes de iniciar a construção dos componentes.