import time
import machine
import m_BLE
import bluetooth

# UUID の設定
SERVICE_UUID = bluetooth.UUID("0000ffe0-0000-1000-8000-0080000b34fb")  # サービス UUID
TX_CHAR_UUID = bluetooth.UUID("0000ffe1-0000-1000-8000-0080000b34fb")  # 送信キャラクタリスティック
RX_CHAR_UUID = bluetooth.UUID("0000ffe2-0000-1000-8000-0080000b34fb")  # 受信キャラクタリスティック

BLE_NAME="PicoW_BLE" #Bluetoothデバイス表示名

# LED 制御用(内蔵LED)
led = machine.Pin("LED", machine.Pin.OUT)

# 受信したデータに対応した処理を行う
def handle_received_data(message):
    if message.upper() == "LED_ON":
        led.on()
        ble_uart.send("LEDをONにしました")
        print("LED を ON にしました")
    elif message.upper() == "LED_OFF":
        led.off()
        ble_uart.send("LEDをOFFにしました")
        print("LED を OFF にしました")
    else:
        print("不明なコマンド:", message)

# BLEUART クラスをインスタンス化（受信処理を handle_received_data に設定）
ble_uart = m_BLE.BLEUART(BLE_NAME,SERVICE_UUID,TX_CHAR_UUID,RX_CHAR_UUID,handle_received_data)


# メインループ(常に行う処理がなにかあれば書く)
while True:
    
    #client側にデータを送信する関数
    #ble_uart.send("Hello from PicoW")
    time.sleep(5)

