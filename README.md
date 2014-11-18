# Tamper
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/dutzi/tamper?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Tamper is a [Mitmproxy](http://www.mitmproxy.org) based devtools extension that lets you edit remote files locally and serve them directly to Chrome.

![Demo](https://github.com/dutzi/tamper/blob/master/assets/demo.gif)
### Using Tamper

Once installed, Tamper will add a new panel to your devtools, the "Tamper" panel. Similar to the Network panel, the Tamper panel shows you a list of all requests made by this page. Click on one of these network requests and the response Chrome got will open in your default editor. Make the changes you need and save the file. Once you hit refresh, Tamper will serve Chrome the file you just saved.

Tamper is based on the awesome Mitmproxy (man-in-the-middle proxy), or more precisely, libmproxy, its companion library that allows implementing powerful interception proxies.

### Installing

* Install Tamper's python script
```
pip install tamper
```
* Install [Tamper's devtools extension](https://chrome.google.com/webstore/detail/tamper/mabhojhgigkmnkppkncbkblecnnanfmd)
