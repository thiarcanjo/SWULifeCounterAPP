/**
 * Cards recon
 */
document.addEventListener('deviceready', onDeviceReady, false);

let imageOriginalCut = null;           // Guardará o objeto Image original
let imageDataURLOriginal = null;    // Guardará a DataURL original

// Variáveis globais ou no escopo adequado para o estado do arrasto
let isDraggingGuide = false;
let initialMouseX, initialMouseY; // Posição inicial do mouse/toque
let initialGuideX, initialGuideY; // Posição inicial do guia

// Referências aos elementos do DOM (podem ser definidas em onDeviceReady ou quando a UI é mostrada)
let guiaElement = null;
let areaPreviewElement = null; // O container da imagem e do guia
let imagemPreviewElement = null; // A imagem de preview em si


function onDeviceReady() {
    console.log('Device is ready');
    // Exemplo de como adicionar um listener a um botão para tirar foto
    document.getElementById('takePictureButton').addEventListener('click', takePicture);

    // Inicializa os elementos aqui para que estejam disponíveis para as funções de arrastar
    guiaElement = document.getElementById('guiaRetanguloVermelho');
    areaPreviewElement = document.getElementById('areaPreviewComGuia');
    imagemPreviewElement = document.getElementById('imagemCapturadaPreview');
    imagemPreviewElement.style.display = 'none'; // Esconde inicialmente
    guiaElement.style.display = 'none'; // Esconde inicialmente

    // Configura o evento de clique do botão de processar (se ainda não estiver configurado)
    const btnProcessar = document.getElementById('btnProcessarCodigo');
    if (btnProcessar) {
        btnProcessar.onclick = function() {
            if (!imageOriginalCut || !imageOriginalCut.complete || !guiaElement || !imagemPreviewElement) {
                alert("Imagem original ou elementos da guia não estão prontos.");
                return;
            }
            // Usa a imagemPreviewElement para calcular as proporções da guia
            const coordsGuia = obterCoordenadasRelativasDaGuia(imagemPreviewElement, guiaElement, imageOriginalCut.width, imageOriginalCut.height);
            cortarEProcessarImagem(imageOriginalCut, coordsGuia);
            //if(areaPreviewElement) areaPreviewElement.style.display = 'none';
            btnProcessar.style.display = 'none';
        };
    }
}

function showStatus(mensage) {
    const divStatus = document.getElementById('divStatus');
    if (divStatus) {
        divStatus.innerHTML = mensage;
        divStatus.style.display = 'block';
    }
}
function hideStatus() {
    const divStatus = document.getElementById('divStatus');
    if (divStatus) {
        divStatus.style.display = 'none';
    }
}

function showCardResult(card) {
    const divResultado = document.getElementById('divResultado');
    const infoCard = document.getElementById('infoCard');

    if (divResultado && infoCard) {
        infoCard.innerHTML = ''; // Limpa resultados anteriores
        if (card) {
            const itens = [];
            if(Array.isArray(card)){
                card.forEach(c => {
                    itens.push({
                        'name': c.name,
                        'code': c.code
                    });
                });
                
                for (const chave in itens) {
                    const li = document.createElement('li');
                    li.textContent = `(${itens[chave]['code']}) ${itens[chave]['name']}`;
                    infoCard.appendChild(li);
                }
            }
            divResultado.style.display = 'block';
        } else {
            infoCard.innerHTML = '<li>NO Card info to show.</li>';
            divResultado.style.display = 'block';
        }
    }
}
function hideCardResult() {
    const divResultado = document.getElementById('divResultado');
    if (divResultado) {
        divResultado.style.display = 'none';
    }
}

function takePicture() {
    if (navigator.camera) {
        navigator.camera.getPicture(onSuccess, onFail, {
            quality: 85, // Qualidade da imagem (0-100)
            destinationType: Camera.DestinationType.DATA_URL, // Retorna imagem como string base64
            sourceType: Camera.PictureSourceType.CAMERA, // Usar a câmera
            allowEdit: false, // Permitir edição simples antes de selecionar
            encodingType: Camera.EncodingType.JPEG,
            mediaType: Camera.MediaType.PICTURE,
            saveToPhotoAlbum: false, // Salvar a foto no álbum do dispositivo
            correctOrientation: true, // Corrige a orientação da imagem
            targetWidth: 1600, // Opcional: redimensionar largura
            // targetHeight: 1000 // Opcional: redimensionar altura
        });
    } else {
        showStatus("ERROR: Plugin not found.");
    }
}

function onSuccess(imageData) {
    // Se destinationType for DATA_URL:
    if (imageData && !imageData.startsWith('data:image/jpeg;base64,')) {
        imageData = "data:image/jpeg;base64," + imageData;
    }
    imageDataURLOriginal = imageData; // Armazena a imagem original como DataURL
    // Agora você pode exibir a imagem ou enviá-la para processamento
    // Ex: document.getElementById('myImage').src = imageSrc;
    console.log("IMAGE capture!");

    if (!imageData || typeof imageData !== 'string' || imageData.length < 10) { // Verifica se é uma string base64 válida minimamente
        console.error("imageData inválida recebida da câmera:", imageData);
        mostrarStatus("Erro: Dados da imagem da câmera inválidos.");
        return;
    }

    // Prepara área para tratar a imagem capturada
    if (!imagemPreviewElement || !areaPreviewElement || !guiaElement) {
        console.error("Elementos da UI para preview/corte não encontrados.");
        mostrarStatus("Erro na interface de preview.");
        return;
    }

    const btnProcessar = document.getElementById('btnProcessarCodigo');
    imagemPreviewElement.style.display = 'block'; // Esconde inicialmente

    imageOriginalCut = new Image();
    imageOriginalCut.onload = function() {
        console.log(`Dimensões originais: ${this.width} x ${this.height}px`);
        imagemPreviewElement.src = imageData;
        areaPreviewElement.style.display = 'inline-block';
        if(btnProcessar) btnProcessar.style.display = 'block';
        ajustarGuiaRetangulo(imagemPreviewElement, guiaElement, this.width, this.height);
        // Configura os eventos para tornar o guia arrastável
        setupDraggableGuide();
    };
    imageOriginalCut.onerror = function() {
        console.error("Erro ao carregar imagem original para corte.");
        mostrarStatus("Erro ao carregar imagem para preview.");
    };
    imageOriginalCut.src = imageData;
}

function onFail(message) {
    showStatus('ERROR: FAIL on load image: ' + message);
    console.error('ERROR: FAIL on load image: ' + message);
    hideCardResult();
}

// Função para enviar a imagem (string base64) para o servidor
function processOCR(textOCR) {
    $.ajax({
        url: baseUrl+'ajax/recon.php',
        type: 'POST',
        data: {
            textOCR: textOCR // texto ocr extraído
        },
        dataType: 'json', // Espera uma resposta JSON do servidor
        xhrFields: {
            withCredentials: true
        },
        beforeSend: function() {
            // Mostrar algum indicador de loading no app
            showStatus("Send image for process...");
            console.log("Send image for process...");
        },
        success: function(response) {
            // Processar a resposta do servidor
            hideStatus();
            console.log("Server response:", response);
            if (response && response.status=="success" && response.data) {
                showStatus(response.message);
                showCardResult(response.data);
                console.log("CARD Identify:", response.data);
            } else {
                const mensagemErro = response && response.message ? response.message : "Card not founded on DB: "+concat(response.message || "UKNOWN ERROR.");
                showStatus("ERROR: Recon fail - " + mensagemErro);
                console.warn("ERROR: Recon fail - ", mensagemErro, response);
                hideCardResult();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            hideStatus();
            showStatus("AJAX ERROR:", textStatus);
            console.error("AJAX ERROR:", textStatus, errorThrown, jqXHR.responseText);
            hideCardResult();
        },
        complete: function() {
            // Esconder o indicador de loading
        }
    });
}

async function TesseractJSRecon(imageBase64) {
    showStatus("Iniciando Tesseract.js...");
    hideCardResult();

    if (typeof Tesseract === 'undefined') {
        showStatus("Erro: Biblioteca Tesseract.js não carregada.");
        console.error("Tesseract.js não está definido. Verifique a inclusão do script.");
        return;
    }

    try {
        const worker = await Tesseract.createWorker();

        showStatus("Processando imagem com Tesseract.js...");
        const { data: { text } } = await worker.recognize(imageBase64, 'eng'); 
        
        console.log("Texto OCR extraído pelo Tesseract.js:", text);
        showStatus("Texto extraído! Enviando para o servidor...");

        processOCR(text); 

        await worker.terminate(); // Libera o worker
    } catch (error) {
        console.error("Erro durante o reconhecimento com Tesseract.js:", error);
        showStatus("Erro no OCR no dispositivo: " + error);
        showStatus(); // Esconde a mensagem de status após um tempo ou se houver erro
    }
}

// Função para ajustar o retângulo guia sobre a imagem de preview
function ajustarGuiaRetangulo(imgElementPreview, guiaElement, imgOriginalWidth, imgOriginalHeight) {
    // Define a proporção e posição do retângulo guia em relação à imagem ORIGINAL
    // Exemplo: canto inferior direito, pegando 30% da largura e 15% da altura
    const proporcaoX = 0.40; // Começa em 65% da largura
    const proporcaoY = 0.20; // Começa em 80% da altura
    const proporcaoLargura = 0.55; // 30% da largura total da imagem
    const proporcaoAltura = 0.10;  // 20% da altura total da imagem

    // Calcula a posição e tamanho em pixels do guia na IMAGEM DE PREVIEW
    const guiaLeft = imgElementPreview.offsetWidth * proporcaoX;
    const guiaTop = imgElementPreview.offsetHeight * proporcaoY;
    const guiaWidth = imgElementPreview.offsetWidth * proporcaoLargura;
    const guiaHeight = imgElementPreview.offsetHeight * proporcaoAltura;

    guiaElement.style.left = guiaLeft + 'px';
    guiaElement.style.top = guiaTop + 'px';
    guiaElement.style.width = guiaWidth + 'px';
    guiaElement.style.height = guiaHeight + 'px';
    guiaElement.style.display = 'block';
}

// Função para obter as coordenadas da guia em relação à imagem ORIGINAL
function obterCoordenadasRelativasDaGuia(imgElementPreview, guiaElement, imgOriginalWidth, imgOriginalHeight) {
    // Posição do guia (em pixels) em relação ao canto superior esquerdo do areaPreviewElement
    const guiaScreenX = guiaElement.offsetLeft;
    const guiaScreenY = guiaElement.offsetTop;
    
    // Posição da imagem de preview (em pixels) em relação ao canto superior esquerdo do areaPreviewElement
    const previewScreenX = imgElementPreview.offsetLeft;
    const previewScreenY = imgElementPreview.offsetTop;

    // Posição do guia relativa à imagem de preview
    const guiaRelativoPreviewX = guiaScreenX - previewScreenX;
    const guiaRelativoPreviewY = guiaScreenY - previewScreenY;

    // Proporções baseadas na imagem de preview exibida
    const proporcaoXGuia = guiaRelativoPreviewX / imgElementPreview.offsetWidth;
    const proporcaoYGuia = guiaRelativoPreviewY / imgElementPreview.offsetHeight;
    const proporcaoLarguraGuia = guiaElement.offsetWidth / imgElementPreview.offsetWidth;
    const proporcaoAlturaGuia = guiaElement.offsetHeight / imgElementPreview.offsetHeight;

    return {
        x: imgOriginalWidth * proporcaoXGuia,
        y: imgOriginalHeight * proporcaoYGuia,
        largura: imgOriginalWidth * proporcaoLarguraGuia,
        altura: imgOriginalHeight * proporcaoAlturaGuia
    };
}

function cortarEProcessarImagem(imagemObjOriginal, coords) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = Math.round(coords.largura); // Arredondar para evitar subpixels
    canvas.height = Math.round(coords.altura);

    // Desenha a porção CORTADA da imagem original no canvas
    // ctx.drawImage(imageObject, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);
    ctx.drawImage(
        imagemObjOriginal,
        Math.round(coords.x),      // sourceX
        Math.round(coords.y),      // sourceY
        Math.round(coords.largura),// sourceWidth
        Math.round(coords.altura), // sourceHeight
        0,                         // destX
        0,                         // destY
        canvas.width,              // destWidth
        canvas.height              // destHeight
    );
    console.log(`Imagem cortada para ${canvas.width}x${canvas.height}px`);
    
    const previewCortadaAntes = document.getElementById('imagemPreviewCortadaAntes'); // Crie este elemento img se quiser ver
    if(previewCortadaAntes) previewCortadaAntes.src = canvas.toDataURL('image/jpeg');

    // 2. Converter para Escala de Cinza
    const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageDataObj.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Média ponderada comum para luminância (outras fórmulas existem)
        const avg = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i]     = avg; // red
        data[i + 1] = avg; // green
        data[i + 2] = avg; // blue
    }
    ctx.putImageData(imageDataObj, 0, 0);
    console.log("Imagem convertida para escala de cinza.");

    // (Opcional) Exibir o preview da imagem em escala de cinza
    const previewEscalaCinza = document.getElementById('imagemPreviewEscalaCinza'); // Crie este elemento img
    if(previewEscalaCinza) previewEscalaCinza.src = canvas.toDataURL('image/png');

    // 3. Binarização (Preto e Branco) - Esta etapa pode ser MUITO eficaz
    // Você precisará experimentar com o valor do 'limiar' (threshold)
    const imageDataInvertida = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dataI = imageDataInvertida.data;
    for (let i = 0; i < dataI.length; i += 4) {
        dataI[i]     = 255 - dataI[i];     // Inverte vermelho
        dataI[i + 1] = 255 - dataI[i + 1]; // Inverte verde
        dataI[i + 2] = 255 - dataI[i + 2]; // Inverte azul
    }
    ctx.putImageData(imageDataInvertida, 0, 0);
    console.log("Cores da imagem binarizada invertidas.");

    const imagemProcessadaDataURL = canvas.toDataURL('image/png'); // PNG é geralmente melhor para OCR após binarização
    console.log("Imagem final pré-processada e pronta para Tesseract.js.");

    TesseractJSRecon(imagemProcessadaDataURL);
}

function setupDraggableGuide() {
    if (!guiaElement || !areaPreviewElement) {
        console.error("Elementos para guia arrastável não encontrados/inicializados.");
        return;
    }
    guiaElement.style.cursor = 'move';

    // Remove listeners antigos para evitar duplicação se chamado múltiplas vezes
    guiaElement.removeEventListener('mousedown', startDragGuide);
    guiaElement.removeEventListener('touchstart', startDragGuide);

    guiaElement.addEventListener('mousedown', startDragGuide);
    guiaElement.addEventListener('touchstart', startDragGuide, { passive: false });
}

function startDragGuide(e) {
    e.preventDefault(); // Previne comportamento padrão como seleção de texto ou scroll da página
    isDraggingGuide = true;

    // Pega a posição inicial do guia em relação ao seu offsetParent (areaPreviewElement)
    initialGuideX = guiaElement.offsetLeft;
    initialGuideY = guiaElement.offsetTop;

    if (e.type === 'touchstart') {
        initialMouseX = e.touches[0].clientX;
        initialMouseY = e.touches[0].clientY;
        document.addEventListener('touchmove', dragGuide, { passive: false });
        document.addEventListener('touchend', stopDragGuide);
        document.addEventListener('touchcancel', stopDragGuide); // Lida com cancelamento
    } else { // mousedown
        initialMouseX = e.clientX;
        initialMouseY = e.clientY;
        document.addEventListener('mousemove', dragGuide);
        document.addEventListener('mouseup', stopDragGuide);
    }
}

function dragGuide(e) {
    if (!isDraggingGuide) return;
    e.preventDefault();

    let currentMouseX, currentMouseY;
    if (e.type === 'touchmove') {
        currentMouseX = e.touches[0].clientX;
        currentMouseY = e.touches[0].clientY;
    } else { // mousemove
        currentMouseX = e.clientX;
        currentMouseY = e.clientY;
    }

    const dx = currentMouseX - initialMouseX; // Delta X do mouse/toque
    const dy = currentMouseY - initialMouseY; // Delta Y do mouse/toque

    let newLeft = initialGuideX + dx;
    let newTop = initialGuideY + dy;

    // Restringir o movimento do guia aos limites do areaPreviewElement (que contém a imagem)
    const maxLeft = areaPreviewElement.offsetWidth - guiaElement.offsetWidth;
    const maxTop = areaPreviewElement.offsetHeight - guiaElement.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft)); // Garante que left >= 0 e left <= maxLeft
    newTop = Math.max(0, Math.min(newTop, maxTop));   // Garante que top >= 0 e top <= maxTop

    guiaElement.style.left = newLeft + 'px';
    guiaElement.style.top = newTop + 'px';
}

function stopDragGuide(e) {
    if (!isDraggingGuide) return;
    isDraggingGuide = false;

    if (e.type === 'touchend' || e.type === 'touchcancel') {
        document.removeEventListener('touchmove', dragGuide);
        document.removeEventListener('touchend', stopDragGuide);
        document.removeEventListener('touchcancel', stopDragGuide);
    } else { // mouseup
        document.removeEventListener('mousemove', dragGuide);
        document.removeEventListener('mouseup', stopDragGuide);
    }
    console.log(`Guia Vermelho movido para: Left=${guiaElement.style.left}, Top=${guiaElement.style.top}`);
}