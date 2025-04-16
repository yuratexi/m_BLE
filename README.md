# m_BLE
raspberry pi pico2wでBluetoothを用いてデータを送受信するのを少し楽にするためのやつ
サンプルコードはsampleフォルダに入ってるので使ってみてください  
気が向いたら解説動画作ります  

firmware(BOOTSELボタン押しながらPCにぶっ刺してエクスプローラーから入れたら閉じるやつ)は以下からダウンロードしてください
[https://micropython.org/download/RPI_PICO2_W/](https://micropython.org/download/RPI_PICO2_W/)


# そもそもm_BLEを使うと何ができるの？
別のデバイス(windows等)のブラウザ(以降PCと呼称)と  
raspberry pi pico2w(以降pico2wと呼称)  
この2つの間で文字列をやり取りすることができる  
(多分pico wでも動くと思う...)  

これを少し応用すると、PCから遠隔でpico2wのGPIOを操作する等ができるようになる  
ただし、PC側は[Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)という機能を利用しているので、デバイスが対応していないと操作できない  

対応してるデバイスの例)Windows(Google Chrome,Microsoft Edge...) Android(Google Chrome...)  
対応していないデバイスの例)iphone  
※2025/3/25現在の例 最新の情報は[Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)参照  


# 動作環境
・PC側環境  
　・OS:windows11(windows10でも動くはず)  
 　・ブラウザ:Google Chrome(Edgeでも動くはず...)  
  　・IDE(プログラミングするやつ):[Thonny](https://thonny.org/)

・raspberry pi pico2w側環境  
　・firmware:[https://micropython.org/download/RPI_PICO2_W/](https://micropython.org/download/RPI_PICO2_W/)    
 　(v1.25.0-preview.393.gf1018ee5c (2025-03-17).uf2ってやつを使ったが、公開されてる最新版を使うほうがいいと思う。動かなかったときにこれを使うぐらいで...)  

# sampleプログラムの使い方
・client(chrome)をPC側に配置(desktopとか...)  
・pico2wの中身(main.py,m_BLE.py)をpico2w内に配置  
　(Thonnyで新しくファイルを作る→main.pyの内容をコピペ→raspberry pi picoにmain.pyという名前で保存)  
　(Thonnyで新しくファイルを作る→m_BLE.pyの内容をコピペ→raspberry pi picoにm_BLE.pyという名前で保存)  

これができたらThonnyでmain.pyを実行する  
すると、「アドバタイズ開始: PicoW_BLE」という表示が出るはず。これが出ればOK  

そしたら、PC側でclient(chrome)の中にあるindex.htmlを開く(ChromeかEdgeで)
そしたら「pico2wと接続」というボタンを押すと「ペア設定を要求しています」みたいなウィンドウが出るので「PicoW_BLE」が表示されるのを待つ(環境によってはちょっと時間かかる)  
(PC側のBluetooth機能をONにしておくのを忘れずに...)  
  
表示されたら「PicoW_BLE」を選択して「ペア設定」をクリック  
  
そして正常に通信ができれば「PicoW_BLEに接続完了！」と表示が出るので、これでペアリング完了  

この状態でPC側の「LEDをONにする」「LEDをOFFにする」というボタンを押すとpico2wの内蔵LEDが光ったり光らなかったりするはず...  

# sampleプログラムの簡単な説明
・pico2w main.pyの7～9行目,PC側 main.jsの11～13行目  
　SERVICE_UUID,TX_CHAR_UUID,RX_CHAR_UUIDはそれぞれ別のUUIDを指定する(main.py,main.jsでは同じ値にしないといけない)  

・pico2w main.pyの11行目,PC側 main.jsの16行目  
　BLE_NAMEはデバイスの名前(sampleプログラムの使い方でいうPicoW_BLE。自由に変えれる)  

・PC側 main.js rasp_SendMessage()関数  
　pico2wにメッセージを送ることができる  
   
  使用例(pico2wに「LED_ON」というメッセージを送る)  
  rasp_SendMessage("LED_ON")  

・pico2w main.pyの30行目  
　m_BLE.BLEUARTの引数詳細  
  m_BLE.BLEUART(BLE_NAME,SERVICE_UUID,TX_CHAR_UUID,RX_CHAR_UUID,メッセージを受け取ったときに呼び出す関数名)  

・pico2w main.pyの17行目 handle_received_data関数  
　PC側で、rasp_SendMessage関数を呼び出すとpico2w側で呼び出される関数  
  例えば、PC側で rasp_SendMessage("LED_ON") と呼び出すと  
  pico2w側で message.upper()=="LED_ON" のifに分岐する(そしてその中の処理が行われる)  

・pico2w main.py ble_uart.send関数  
　PC側にメッセージを送ることができる  
  使用例
  ble_uart.send("Hello World!!")  
  
・PC側 main.js 47行目のイベントハンドラ  
　このイベントハンドラは、pico2w側でble_uart.send関数を呼び出すとmain.js側で発動する
  text変数の中に受け取ったメッセージが入っているので、受け取ったメッセージによって分岐したいのであればtextの値で分岐するとヨシ

  例
  ```js
　if(text=="Hello World!!'){
      //処理色々
    }
  ```
　
 # 更新履歴
 2025/3/25:頒布開始  
 2025/4/16:m_BLE.pyを修正(ブラウザ側から切断したときに、pico2wを再起動しなくても正常に再接続できるようになった)
