/**
 * Raspberry Pi Pico2WとのBLE通信を管理するクラス
 */
class PicoWBLE {
    /**
     * @param {string} bleName - Bluetoothデバイス名
     * @param {string} serviceUuid - サービスUUID
     * @param {string} txCharUuid - 送信キャラクタリスティックUUID
     * @param {string} rxCharUuid - 受信キャラクタリスティックUUID
     * @param {HTMLElement} connectButton - 接続ボタン要素
     * @param {HTMLElement} statusDiv - ステータス表示用要素
     * @param {HTMLElement} logDiv - ログ表示用要素
     */
    constructor(bleName, serviceUuid, txCharUuid, rxCharUuid, connectButton, statusDiv, logDiv) {
        this.bleName = bleName;
        this.serviceUuid = serviceUuid;
        this.txCharUuid = txCharUuid;
        this.rxCharUuid = rxCharUuid;
        this.connectButton = connectButton;
        this.statusDiv = statusDiv;
        this.logDiv = logDiv;
        
        this.device = null;
        this.server = null;
        this.rxChar = null; // 書き込み用キャラクタリスティック
        this.txChar = null; // 通知用キャラクタリスティック
        
        this._setupEventListeners();
    }

    /**
     * イベントリスナーを設定
     */
    _setupEventListeners() {
        this.connectButton.addEventListener('click', () => this.connect());
        
        // ブラウザを閉じるときに Bluetooth を切断
        window.addEventListener('beforeunload', () => {
            if (this.device && this.device.gatt.connected) {
                this.device.gatt.disconnect();
                console.log('Bluetooth disconnected due to page unload.');
            }
        });
    }

    /**
     * Raspberry Pi Pico2Wに接続
     */
    async connect() {
        try {
            // デバイス選択：名前とサービスUUIDでフィルター
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ name: this.bleName }],
                optionalServices: [this.serviceUuid]
            });
            console.log('Device selected:', this.device.name);
            this.statusDiv.innerText = '接続試行中...';
            
            // GATTサーバーへ接続
            this.server = await this.device.gatt.connect();
            this.statusDiv.textContent = `${this.device.name}と接続確立中...`;
            console.log('Connected to GATT server');

            // サービス取得
            const service = await this.server.getPrimaryService(this.serviceUuid);
            console.log('Service discovered:', service.uuid);

            // 通知（送信用）キャラクタリスティック TX の取得（受信通知用）
            this.txChar = await service.getCharacteristic(this.txCharUuid);
            console.log('TX Characteristic discovered:', this.txChar.uuid);

            // 書き込み用キャラクタリスティック RX の取得（HTML→Pico送信用）
            this.rxChar = await service.getCharacteristic(this.rxCharUuid);
            console.log('RX Characteristic discovered:', this.rxChar.uuid);

            // TXキャラクタリスティックで通知イベントを設定（受信側のデータ）
            this.txChar.addEventListener('characteristicvaluechanged', (event) => {
                this._onReceiveData(event);
            });

            // 必要に応じて少し待機
            await new Promise(resolve => setTimeout(resolve, 100));

            // TXキャラクタリスティックで通知を開始
            await this.txChar.startNotifications();
            console.log('Notifications started on TX characteristic.');
            this.statusDiv.textContent = `${this.device.name}に接続完了！`;
            this.connectButton.disabled = true;

        } catch (error) {
            console.error('Connection error:', error);
            this._handleConnectionError(error);
        }
    }

    /**
     * データ受信時の処理
     * @param {Event} event - characteristicvaluechanged イベント
     */
    _onReceiveData(event) {
        const value = event.target.value;
        const text = new TextDecoder().decode(value);

        // ? データを受信したらなにか処理をする場合はここに書く

        console.log(`Received: ${text}`);
        this.logDiv.innerText += text + '\n';
    }

    /**
     * 接続エラー処理
     * @param {Error} error - エラーオブジェクト
     */
    _handleConnectionError(error) {
        const errorMessage = error.toString();
        
        if (errorMessage.includes('User cancelled the requestDevice() chooser')) {
            this.statusDiv.innerText = 'NotFoundError: User cancelled the requestDevice() chooser.\n接続失敗: デバイスの選択がキャンセルされました。もう一度接続してください';
        } else if (errorMessage.includes('Connection attempt failed')) {
            this.statusDiv.innerText = 'NetworkError: Connection Error: Connection attempt failed.\n接続に失敗しました。このエラーが出るということはおそらくpicoが死んだのでpicoを再起動してください';
        } else {
            this.statusDiv.textContent = 'Connection error: ' + error;
        }
    }

    /**
     * Bluetoothで接続したRaspberry Pi Pico2Wにメッセージを送信
     * @param {string} message - 送信する文字列
     */
    async sendMessage(message) {
        try {
            if (!this.rxChar) {
                throw new Error('デバイスに接続されていません');
            }
            
            // テキストエンコーダーでUint8Arrayに変換
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            await this.rxChar.writeValue(data);
            console.log('Sent:', message);
        } catch (error) {
            console.error('Send error:', error);
            this.connectButton.disabled = false;
            this.statusDiv.textContent = `接続に失敗しました。再度接続してみてください`;
        }
    }

    /**
     * デバイスが接続されているか確認
     * @returns {boolean} 接続状態
     */
    isConnected() {
        return this.device && this.device.gatt.connected;
    }

    /**
     * デバイスから切断
     */
    disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
            console.log('Bluetooth disconnected.');
            this.connectButton.disabled = false;
            this.statusDiv.textContent = '切断しました';
        }
    }
}


// ========================================
// 使用例
// ========================================

// UUIDの設定(raspberry pi pico2w側と同じ値にすること！！)(小文字しか使用不可)
const SERVICE_UUID = '0000ffe0-0000-1000-8000-0080000b34fb';   // サービスUUID
const TX_CHAR_UUID = '0000ffe1-0000-1000-8000-0080000b34fb';   // 送信キャラクタリスティック
const RX_CHAR_UUID = '0000ffe2-0000-1000-8000-0080000b34fb';   // 受信キャラクタリスティック

// Bluetoothデバイスの名前(raspberry pi pico2w側と同じ値にすること！！)
const BLE_NAME = 'PicoW_BLE';

// DOM要素の取得
const connectButton = document.getElementById('connect');
const statusDiv = document.getElementById('log');
const pico = document.getElementById('pico');

// PicoWBLEクラスのインスタンスを作成
const picoDevice = new PicoWBLE(
    BLE_NAME,
    SERVICE_UUID,
    TX_CHAR_UUID,
    RX_CHAR_UUID,
    connectButton,
    statusDiv,
    pico
);

/**
 * Bluetoothで接続したraspberry pi pico2wにmessageを送信する関数
 * @param {string} message - 送信する文字列
 */
async function rasp_SendMessage(message) {
    await picoDevice.sendMessage(message);
}


// ========================================
// 複数デバイスへの対応方法
// ========================================
/*
 * 複数のPico2Wデバイスに接続する場合は、以下の手順で実装してください。
 * 
 * 1. HTMLに各デバイス用のボタンとログ表示エリアを追加
 * 
 * <button id="connect1">デバイス1に接続</button>
 * <div id="log1"></div>
 * <div id="pico1"></div>
 * 
 * <button id="connect2">デバイス2に接続</button>
 * <div id="log2"></div>
 * <div id="pico2"></div>
 * 
 * 
 * 2. 各デバイス用のPicoWBLEインスタンスを作成
 * 
 * // デバイス1
 * const picoDevice1 = new PicoWBLE(
 *     'PicoW_BLE_1',                          // デバイス1の名前
 *     SERVICE_UUID_1,
 *     TX_CHAR_UUID_1,
 *     RX_CHAR_UUID_1,
 *     document.getElementById('connect1'),    // デバイス1用の接続ボタン
 *     document.getElementById('log1'),        // デバイス1用のステータス表示
 *     document.getElementById('pico1')        // デバイス1用のログ表示
 * );
 * 
 * // デバイス2
 * const picoDevice2 = new PicoWBLE(
 *     'PicoW_BLE_2',                          // デバイス2の名前
 *     SERVICE_UUID_2,
 *     TX_CHAR_UUID_2,
 *     RX_CHAR_UUID_2,
 *     document.getElementById('connect2'),    // デバイス2用の接続ボタン
 *     document.getElementById('log2'),        // デバイス2用のステータス表示
 *     document.getElementById('pico2')        // デバイス2用のログ表示
 * );
 * 
 * 
 * 3. 各デバイスに対して個別にメッセージを送信
 * 
 * // デバイス1にメッセージ送信
 * await picoDevice1.sendMessage('Hello from Device 1');
 * 
 * // デバイス2にメッセージ送信
 * await picoDevice2.sendMessage('Hello from Device 2');
 * 
 * 
 * 4. 接続状態の確認や切断も個別に実行可能
 * 
 * // デバイス1の接続状態を確認
 * if (picoDevice1.isConnected()) {
 *     console.log('デバイス1は接続されています');
 * }
 * 
 * // デバイス2を切断
 * picoDevice2.disconnect();
 * 
 * 
 * 注意事項:
 * - 各Pico2Wデバイスには異なるBLE名を設定してください（例: 'PicoW_BLE_1', 'PicoW_BLE_2'）
 * - UUIDは各Pico2Wデバイス毎に別のものを割り当てることを推奨します
 * - 同時に複数のデバイスに接続可能ですが、ブラウザのBluetooth制限に注意してください
 */