// NO SLEEP
const noSleep = new NoSleep();
let baseLife1 = 0;
let baseLife2 = 0;

/**
 * MOSTRA o contador de vida na mesa do player selecionado
 * 
 * @param {string} playerID 
 */
function addCounter(playerID){
    var dPlayer = document.getElementById(playerID);
    var count = dPlayer.querySelector('.count');
    count.innerHTML = '';

    var bArea = document.createElement('div');
    bArea.className = 'btn_area w10 h8';

    var lifeHistory = document.createElement('div');
    lifeHistory.className = 'life_history w10 h2';
    lifeHistory.innerHTML = '<p id="history_'+playerID+'" class="history"></p>';

    var buttonSUB = document.createElement('button');
    buttonSUB.className = 'btn-sub '+playerID;
    buttonSUB.setAttribute('onclick','changeBaseLife(this);');
    buttonSUB.textContent = '-';
    bArea.append(buttonSUB);

    var life = document.createElement('p');
    life.id = 'count-now_'+playerID;
    life.textContent = '0';
    bArea.append(life);

    var buttonADD = document.createElement('button');
    buttonADD.className = 'btn-add '+playerID;
    buttonADD.setAttribute('onclick','changeBaseLife(this);');
    buttonADD.textContent = '+';
    bArea.append(buttonADD);

    count.append(bArea);
    count.append(lifeHistory);
}

/**
 * Muda o valor do LIFE na base
 * 
 * @param {string} btn 
 */
let timer = new Array();
let contador = new Array();
function changeBaseLife(btn){
    var thisButton = Array.from(btn.classList);
    var count_now = document.getElementById('count-now_'+thisButton[1]);
    var count_value = 0;
    
    if(thisButton.includes("btn-sub")){
        historyCount(thisButton[1],'btn-sub');
        count_value = parseInt(count_now.innerHTML) - 1 ;
        if(count_value <=0 ) count_now.innerHTML = 0;
        else count_now.innerHTML = count_value;
    }
    if(thisButton.includes("btn-add")){
        historyCount(thisButton[1],'btn-add');
        count_value = parseInt(count_now.innerHTML) + 1 ;
        count_now.innerHTML = count_value;
    }

    noSleep.enable();
}


/**
 * BUTTON History
 * 
 * @param {string} btn 
 * @param {*} btnType 
 */
function historyCount(btn,btnType){
    var history = document.getElementById('history_'+btn);
    var history_now = history.innerText[history.innerText.length - 1];
    var id = btn[btn.length - 1];
    if(contador[id] == null) contador[id] = 1;
    else contador[id]++;

    if (!timer[id]) {
        timer[id] = setTimeout(() => {
        if(btnType == 'btn-sub' && (history_now > 0 || history_now == null)){
            history.textContent = '- ';
            history.textContent += contador[id];
        }
        if(btnType == 'btn-add'){
            history.textContent = '+ ';
            history.textContent += contador[id];
        }

        contador[id] = 0;
        timer[id] = null;
        }, 1500);
    }

    setTimeout(() => {
        history.textContent = '';
    },5000);
}

// UPDATE LIFE
document.addEventListener('DOMContentLoaded', function() {
    function updateLife(){
        var updateHistoric = false;
        var player1Life = document.getElementById('count-now_player_1');
        var player2Life = document.getElementById('count-now_player_2');

        if(player1Life){
            player1Life = player1Life.innerHTML;
            if(player1Life != baseLife1) {
                baseLife1 = player1Life;
                updateHistoric = true;
                // AJAX call UPDATE LIFE
                $.ajax({
                    url: baseUrl + 'ajax/app.php',
                    method: 'GET',
                    data: {
                        player: 'player_1',
                        update: 'base_life',
                        value: player1Life
                    },
                    dataType: 'text',
                    xhrFields: {
                        withCredentials: true
                    },
                    error: function (error, txtStatus, errorThrown) {
                        console.error("Error player_1:", txtStatus, errorThrown);
                        console.error("Resposta do servidor player_1:", error.responseText);
                    }
                });
            }
        }

        // AJAX call UPDATE LIFE PLAYER_2
        if(player2Life){
            player2Life = player2Life.innerHTML;
            if(player2Life != baseLife2) {
                baseLife2 = player2Life;
                updateHistoric = true;
                $.ajax({
                    url: baseUrl + 'ajax/app.php',
                    method: 'GET',
                    data: {
                        player: 'player_2',
                        update: 'base_life',
                        value: player2Life
                    },
                    dataType: 'text',
                    xhrFields: {
                        withCredentials: true
                    },
                    error: function (error, txtStatus, errorThrown) {
                        console.error("Error player_2:", txtStatus, errorThrown);
                        console.error("Resposta do servidor player_2:", error.responseText);
                    }
                });
            }
        }

        // UPDATE Historic
        if(updateHistoric) {
            $.ajax({
                url: baseUrl + 'ajax/app.php',
                method: 'GET',
                data: {
                    player: 'player_2',
                    update: 'historic',
                    value: 'update',
                    base1: player1Life,
                    base2: player2Life
                },
                dataType: 'text',
                xhrFields: {
                    withCredentials: true
                },
                success: function (response) {
                    var historyBtn = document.getElementsByClassName('historic-btn');
                    historyBtn[0].style.display = 'flex';
                },
                error: function (error, txtStatus, errorThrown) {
                    console.error("Error historic:", txtStatus, errorThrown);
                    console.error("Resposta do servidor historic:", error.responseText);
                }
            });
            updateHistoric = false;
        }
    }

    setInterval(updateLife, 6000);
    noSleep.enable();
});