let rxChar; // 書き込み用キャラクタリスティックをグローバルに保持

let device = null; // グローバル変数としてデバイス情報を保持
let server = null;

const connectButton = document.getElementById('connect');
const statusDiv = document.getElementById('log');
const pico=document.getElementById('pico');

//UUIDの設定(raspberry pi pico2w側と同じ値にすること！！)(小文字しか使用不可)
const SERVICE_UUID='0000ffe0-0000-1000-8000-0080000b34fb';   //サービスUUID
const TX_CHAR_UUID='0000ffe1-0000-1000-8000-0080000b34fb';   //送信キャラクタリスティック
const RX_CHAR_UUID='0000ffe2-0000-1000-8000-0080000b34fb';   //受信キャラクタリスティック

//Bluetoothデバイスの名前(raspberry pi pico2w側と同じ値にすること！！)
const BLE_NAME='PicoW_BLE';


//raspberry pi pico2wに接続するやつ
connectButton.addEventListener('click', async () => {
    try {
        // デバイス選択：名前とサービスUUIDでフィルター
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: BLE_NAME }],   //raspberry pi pico2wのBluetoothデバイス表示名と同じにすること！
            optionalServices: [SERVICE_UUID]
        });
        console.log('Device selected:', device.name);
        statusDiv.innerText = '接続試行中...';
        // GATTサーバーへ接続
        const server = await device.gatt.connect();
        statusDiv.textContent = `${device.name}と接続確立中...`;
        console.log('Connected to GATT server');

        // サービス取得（UUIDは小文字で）
        const service = await server.getPrimaryService(SERVICE_UUID);
        console.log('Service discovered:', service.uuid);

        // 通知（送信用）キャラクタリスティック TX の取得（受信通知用）
        const txChar = await service.getCharacteristic(TX_CHAR_UUID);
        console.log('TX Characteristic discovered:', txChar.uuid);

        // 書き込み用キャラクタリスティック RX の取得（HTML→Pico送信用）
        rxChar = await service.getCharacteristic(RX_CHAR_UUID);
        console.log('RX Characteristic discovered:', rxChar.uuid);

        // TXキャラクタリスティックで通知イベントを設定（受信側のデータ）
        txChar.addEventListener('characteristicvaluechanged', (event) => {
            const value = event.target.value;
            const text = new TextDecoder().decode(value);




            // ? データを受信したらなにか処理をする場合はここに書く





            console.log(`Received: ${text}`);
            pico.innerText+=text+'\n';
        });

        // **ブラウザを閉じるときに Bluetooth を切断**
        window.addEventListener('beforeunload', () => {
            if (device && device.gatt.connected) {
            device.gatt.disconnect();
            console.log('Bluetooth disconnected due to page unload.');
            }
        });

        // 必要に応じて少し待機
        await new Promise(resolve => setTimeout(resolve, 100));

        // TXキャラクタリスティックで通知を開始
        await txChar.startNotifications();
        console.log('Notifications started on TX characteristic.');
        statusDiv.textContent = `${device.name}に接続完了！`;
        connectButton.disabled=true;

    } catch (error) {
        console.error('Connection error:', error);

        //エラーに対応した対処方法を出力
        if(error=='NotFoundError: User cancelled the requestDevice() chooser.'){
            statusDiv.innerText = 'NotFoundError: User cancelled the requestDevice() chooser.\n接続失敗: デバイスの選択がキャンセルされました。もう一度接続してください';
        }else if(error=='NetworkError: Connection Error: Connection attempt failed.'){
            //ブラウザを落とすとバグる
            statusDiv.innerText = 'NetworkError: Connection Error: Connection attempt failed.\n接続に失敗しました。このエラーが出るということはおそらくpicoが死んだのでpicoを再起動してください';

        }else{
            statusDiv.textContent = 'Connection error:'+error;
        }
    }
});



/**
 * Bluetoothで接続したraspberry pi pico2wにmessageを送信する関数
 * @param {*} message 送信する文字列
 */
async function rasp_SendMessage(message){
    try {
        // テキストエンコーダーでUint8Arrayに変換
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        await rxChar.writeValue(data);
        console.log('Sent:', message);
    } catch (error) {
        console.error('Send error:', error);
        connectButton.disabled=false;
        statusDiv.textContent = `接続に失敗しました。再度接続してみてください`;
    }
}