# APIs Integradas / Integrated APIs

Este documento descreve as APIs gratuitas integradas na extensão Fishing Chrome Extension.

## APIs Utilizadas

### 1. **Open-Meteo Marine Weather API** 🌊
- **URL**: https://open-meteo.com/en/docs/marine-weather-api
- **Gratuita**: ✅ Sim, sem necessidade de API key
- **Dados fornecidos**:
  - Altura das ondas (wave height)
  - Direção das ondas (wave direction)
  - Período das ondas (wave period)
  - Ondas de vento (wind waves)
- **Uso**: Fornece dados reais de ondulação para os spots de pesca

### 2. **Open-Meteo Weather API** 💨
- **URL**: https://open-meteo.com/en/docs
- **Gratuita**: ✅ Sim, sem necessidade de API key
- **Dados fornecidos**:
  - Velocidade do vento (wind speed)
  - Direção do vento (wind direction)
  - Rajadas de vento (wind gusts)
- **Uso**: Fornece dados reais de vento para os spots de pesca

### 3. **Sunrise-Sunset.org API** ☀️🌙
- **URL**: https://sunrise-sunset.org/api
- **Gratuita**: ✅ Sim, sem necessidade de API key
- **Dados fornecidos**:
  - Hora do nascer do sol (sunrise)
  - Hora do pôr do sol (sunset)
  - Meio-dia solar (solar noon)
  - Duração do dia (day length)
  - Crepúsculos (twilight times)
- **Uso**: Fornece tabelas solunares essenciais para pesca

### 4. **Cálculo de Marés (Harmonic Analysis)** 🌓
- **Tipo**: Cálculo local baseado em análise harmónica
- **Método**: Utiliza constituintes de maré principais (M2, S2, N2)
- **Dados fornecidos**:
  - Altura da maré atual
  - Estado da maré (Enchente, Vazante, Preia-mar, Baixa-mar)
  - Próxima mudança de maré
- **Uso**: Estimativa de marés para spots portugueses
- **Nota**: Para produção, recomenda-se usar APIs como WorldTides ou dados do Instituto Hidrográfico

### 5. **Cálculo da Fase Lunar** 🌙
- **Tipo**: Cálculo astronómico local
- **Método**: Algoritmo baseado em lua nova conhecida
- **Dados fornecidos**:
  - Fase da lua (0-1)
  - Nome da fase (Lua Nova, Crescente, Cheia, Minguante, etc.)
- **Uso**: Importante para determinar os melhores períodos de pesca

## Sistema de Fallback

Todas as APIs externas possuem sistema de fallback automático:
- Se a API não estiver disponível, usa dados estimados baseados em:
  - Localização geográfica
  - Época do ano
  - Hora do dia
  - Padrões históricos

## Score de Pesca

O score de pesca (1-10) é calculado considerando:
- ✅ Estado das marés (enchente/vazante são melhores)
- ✅ Altura das ondas (ondas menores são melhores)
- ✅ Condições de vento (vento leve é melhor)
- ✅ Fase da lua (lua nova e cheia são melhores)
- ✅ Hora do dia (aurora e crepúsculo são melhores)

## Requisitos

- Node.js >= 14
- Pacote `node-fetch@2.x` para requisições HTTP

## Licenças

Todas as APIs utilizadas são gratuitas e abertas:
- Open-Meteo: Open Data (CC BY 4.0)
- Sunrise-Sunset.org: Free API
- Cálculos locais: Código próprio

## Melhorias Futuras

Para melhorar a precisão dos dados, considere:
1. **WorldTides API** - Marés mais precisas (possui tier gratuito)
2. **Stormglass.io** - Dados marinhos completos (tier limitado gratuito)
3. **NOAA APIs** - Dados oficiais dos EUA
4. **Instituto Hidrográfico Português** - Dados oficiais para Portugal

## Contacto

Para questões sobre as APIs ou sugestões de melhorias, abra um issue no repositório.
