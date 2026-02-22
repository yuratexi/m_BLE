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