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
        BLE UART クラス
        - name: デバイスの名前
        - service_uuid: サービス UUID
        - tx_uuid: 送信キャラクタリスティック UUID
        - rx_uuid: 受信キャラクタリスティック UUID
        - on_rx: 受信データの処理用コールバック関数
        """
        self.ble = bluetooth.BLE()
        self.ble.active(True)
        self.ble.irq(self._irq)  # BLE イベントの割り込みハンドラ

        # キャラクタリスティックの設定
        self.tx = (tx_uuid, bluetooth.FLAG_READ | bluetooth.FLAG_NOTIFY)
        self.rx = (rx_uuid, bluetooth.FLAG_WRITE | bluetooth.FLAG_WRITE_NO_RESPONSE)

        # サービス登録
        self.service = (service_uuid, (self.tx, self.rx))
        ((self.tx_handle, self.rx_handle),) = self.ble.gatts_register_services([self.service])

        self.connections = set()
        self._advertise(name)

        # 受信処理のカスタム関数（main.py から渡される）
        self.on_rx = on_rx if on_rx else lambda msg: print("受信:", msg)

    def _irq(self, event, data):
        """BLE イベントハンドラ"""
        if event == _IRQ_CONNECT:
            conn_handle, addr_type, addr = data
            print("接続:", self._addr_to_str(addr))
            self.connections.add(conn_handle)
        elif event == _IRQ_DISCONNECT:
            conn_handle, addr_type, addr = data
            print("切断:", self._addr_to_str(addr))
            self.connections.discard(conn_handle)
            self._advertise()  # 切断後は再アドバタイズ
        elif event == _IRQ_GATTS_WRITE:
            conn_handle, attr_handle = data
            if attr_handle == self.rx_handle:
                try:
                    received = self.ble.gatts_read(attr_handle).decode().strip()
                    print("受信:", received)
                    self.on_rx(received)  # 受信データの処理
                except Exception as e:
                    print("受信デコードエラー:", e)

    def send(self, message):
        """接続中のクライアントにメッセージを通知"""
        for conn in self.connections:
            try:
                self.ble.gatts_notify(conn, self.tx_handle, message)
                print("送信:", message)
            except Exception as e:
                print("送信エラー:", e)

    def _advertise(self, name):
        """BLE アドバタイズを開始する"""
        adv_data = self._create_advertising_payload(name, service_uuid=0xFFE0)
        self.ble.gap_advertise(100, adv_data)
        print("アドバタイズ開始:", name)

    def _create_advertising_payload(self, name, service_uuid=None):
        """BLE 広告データの作成"""
        payload = bytearray()
        payload.extend(b"\x02\x01\x06")  # Flags
        name_bytes = name.encode()
        payload.extend(struct.pack("BB", len(name_bytes) + 1, 0x09) + name_bytes)
        if service_uuid:
            payload.extend(struct.pack("<BBH", 3, 0x03, service_uuid))
        return payload

    def _addr_to_str(self, addr):
        """バイト列のアドレスを可読な文字列に変換"""
        return ":".join("{:02X}".format(b) for b in addr)

