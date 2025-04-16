import bluetooth
import struct
from micropython import const

# BLE イベント用定数
_IRQ_CONNECT     = const(1)
_IRQ_DISCONNECT  = const(2)
_IRQ_GATTS_WRITE = const(3)

class BLEUART:
    def __init__(self, name="PicoW_BLE", service_uuid=None, tx_uuid=None, rx_uuid=None, on_rx=None):
        """
        BLEUART クラス

        引数:
          - name: デバイス名（広告時に使用）
          - service_uuid: サービス UUID（例: bluetooth.UUID("0000ffe0-0000-1000-8000-00805f9b34fb")）
          - tx_uuid: 送信用キャラクタリスティック UUID（通知用）
          - rx_uuid: 受信用キャラクタリスティック UUID（書き込み用）
          - on_rx: 受信データを処理するためのコールバック関数（例: on_rx("LED ON")）
        """
        self.ble = bluetooth.BLE()
        self.ble.active(True)
        # 可変長引数で IRQ ハンドラを登録
        self.ble.irq(self._irq)

        # キャラクタリスティックの設定（tx: 通知用, rx: 書き込み用）
        self.tx = (tx_uuid, bluetooth.FLAG_READ | bluetooth.FLAG_NOTIFY)
        self.rx = (rx_uuid, bluetooth.FLAG_WRITE | bluetooth.FLAG_WRITE_NO_RESPONSE)

        # サービス登録
        self.service = (service_uuid, (self.tx, self.rx))
        ((self.tx_handle, self.rx_handle),) = self.ble.gatts_register_services([self.service])
        self.connections = set()
        self._advertise(name)

        # 受信データ処理用のコールバック（指定されなければ標準出力）
        self.on_rx = on_rx if on_rx else lambda msg: print("受信:", msg)

    def _irq(self, *args):
        """
        BLE IRQ ハンドラ
        可変長引数で受け取り、最初の 2 つを (event, data) として利用する。
        """
        if len(args) < 2:
            print("IRQ: 引数が不足しています。args =", args)
            return
        event = args[0]
        data = args[1]
        # data が None の場合はスキップ
        if data is None:
            print("IRQ called with None data, event:", event)
            return

        if event == _IRQ_CONNECT:
            try:
                # data: (conn_handle, addr_type, addr)
                conn_handle, addr_type, addr = data
                print("接続:", self._addr_to_str(addr))
                self.connections.add(conn_handle)
            except Exception as e:
                print("IRQ CONNECT 処理エラー:", e)
        elif event == _IRQ_DISCONNECT:
            try:
                # data: (conn_handle, addr_type, addr)
                conn_handle, addr_type, addr = data
                print("切断:", self._addr_to_str(addr))
                self.connections.discard(conn_handle)
                self._advertise()  # 切断後は再度広告開始
            except Exception as e:
                #function takes 2 positional arguments but 1 were given エラーは無視しても問題ない
                if str(e) != "function takes 2 positional arguments but 1 were given":
                    print("IRQ DISCONNECT 処理エラー:", e)      
        elif event == _IRQ_GATTS_WRITE:
            try:
                # data: (conn_handle, attr_handle)
                conn_handle, attr_handle = data
                if attr_handle == self.rx_handle:
                    received = self.ble.gatts_read(attr_handle).decode().strip()
                    print("受信:", received)
                    self.on_rx(received)
            except Exception as e:
                print("IRQ GATTS_WRITE 処理エラー:", e)
        #else:
            #print("不明なイベント:", event, "data:", data, "追加引数:", args[2:] if len(args) > 2 else None)

    def send(self, message):
        """接続中のすべてのクライアントにメッセージを通知する"""
        for conn in self.connections:
            try:
                self.ble.gatts_notify(conn, self.tx_handle, message)
                print("送信:", message)
            except Exception as e:
                print("送信エラー:", e)

    def _advertise(self, name):
        """BLE 広告を開始する"""
        adv_data = self._create_advertising_payload(name, service_uuid=0xFFE0)
        self.ble.gap_advertise(100, adv_data)
        print("広告開始:", name)
        print("広告データ:", adv_data.hex())

    def _create_advertising_payload(self, name, service_uuid=None):
        """
        広告データの作成  
         - AD Type 0x01: Flags (General Discoverable Mode, BR/EDR 非対応)
         - AD Type 0x09: 完全なローカルネーム
         - AD Type 0x03: 完全な16ビットサービス UUID リスト（オプション、little-endian）
        """
        payload = bytearray()
        payload.extend(b"\x02\x01\x06")  # Flags
        name_bytes = name.encode()
        payload.extend(struct.pack("BB", len(name_bytes) + 1, 0x09) + name_bytes)
        if service_uuid:
            payload.extend(struct.pack("<BBH", 3, 0x03, service_uuid))
        return payload

    def _addr_to_str(self, addr):
        """バイト列のアドレスを可読な文字列に変換する"""
        return ":".join("{:02X}".format(b) for b in addr)


