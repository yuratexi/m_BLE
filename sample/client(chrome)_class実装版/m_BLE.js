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