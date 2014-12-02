# Tamper
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/dutzi/tamper?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Tamper is a [mitmproxy](http://www.mitmproxy.org) based devtools extension that lets you edit remote files locally and serve them directly to Chrome.

![Demo](https://github.com/dutzi/tamper/blob/master/assets/demo.gif)
### Using Tamper

Once installed, Tamper will add a new panel to your devtools, the "Tamper" panel. Similar to the Network panel, the Tamper panel shows you a list of all requests made by this page. Click on one of these network requests and the response Chrome got will open in your default editor. Make the changes you need and save the file. Once you hit refresh, Tamper will serve Chrome the file you just saved.

Tamper is based on the awesome Mitmproxy (man-in-the-middle proxy), or more precisely, libmproxy, its companion library that allows implementing powerful interception proxies.

### Installing

#### Dependencies (Already included in Tamper install script)
* Payton Package Index (pip) [Link](https://pypi.python.org/pypi)
* Man in the middle Proxy (mitmproxy) [Link](http://mitmproxy.org/)

#### Quick Installation
> Note: Tamper includes all its dependencies and install any missing ones during installation, however Tamper install script can't tell if you have old dependencies or they are corrupted. If you encounter any errors during Tamper installation then follow detailed installation guide below (Mac OSX Only)

##### Step 1:
* <code>pip install tamper</code>

##### Step 2:
* Install [Tamper's devtools extension](https://chrome.google.com/webstore/detail/tamper/mabhojhgigkmnkppkncbkblecnnanfmd)

#### Detailed Installation

> Note: All instruction given below are for Mac OSX and tested on latest OSX Yosemite, Also command mentioned below are for console/terminal and some of these command will require _sudo_ (administrator) access.

##### Step 1:
* Install or update your xcode <code>xcode-select --install</code> (this will take about 15 minutes depending on your internet connection).

##### Step 2:
* _Tamper_ and _mitmproxy_ are based on Python so we have to install <strong>Python Package Index (pip)</strong> with this command <code>sudo easy_install pip</code>

##### Step 3:
* After xcode & pip installation, install <strong>mitmproxy</strong> with this command <code>sudo pip install mitmproxy</code>

##### Step 4:
*  Now it is the time to install <strong>Tamper</strong> it self, <code>sudo pip install tamper</code>, if tamper installation is successful you should see following message at the end

> Successfully installed tamper mitmproxy pyOpenSSL Pillow netlib lxml Werkzeug Jinja2 itsdangerous certifi backports.ssl-match-hostname cryptography markupsafe cffi pycparser

> Note: You can also view all installed packages in <strong>pip</strong> with this command <code>pip list</code>

Now verify if _mitmproxy_ is working by typing in this command <code>mitmproxy</code>, if you see a following or similar error

> You are using an outdated version of pyOpenSSL: mitmproxy requires pyOpenSSL 0.14 or greater. Your pyOpenSSL 0.13.1 installation is located at /System/Library/Frameworks/Python.framework/Versions/2.7/Extras/lib/python/OpenSSL

Then fear not, just rename old folder and you are good to go, use this command to rename the folder (change the path according to your PyOpenSSL installation path)

<code>sudo mv /System/Library/Frameworks/Python.framework/Versions/2.7/Extras/lib/python/OpenSSL /System/Library/Frameworks/Python.framework/Versions/2.7/Extras/lib/python/_OpenSSL</code>,
Now try to run _mitmproxy_ again and this time you should see famous _mitmproxy_ interface

> Note: (This setting is not required for Tamper to work, just to validate correct mitmproxy installation) You can also change your network settings to see if mitmproxy is intercepting the traffic, Open *System Preferences* → *Network* → *WIFI* or *Ethernet* → *Advance* → *Proxies* → *Web Proxy (HTTP)* → Web Proxy Server = 127.0.0.1:8080, save these details and apply them

##### Step 5:
* Install [Tamper's devtools extension from Chrome web store](https://chrome.google.com/webstore/detail/tamper/mabhojhgigkmnkppkncbkblecnnanfmd)

##### Step 6:
*  To Debug website with SSL enabled you should have to authorise mitmproxy, open [http://mitm.it](http://mitm.it) and click on _Apple_ (for any platform you intend to use mitmproxy) icon and this will download the certificate, just open this certificate and install it in keychain

##### Step 7:
*  Now open your target website in Chrome and enable _Dev Tools_ (cmd+alt+I) and open _Tamper panel_ and click on little wheel icon on bottom left hand of tamper panel to open tamper settings and restart proxy. Now just enable Tamper from top right corner and you are good to go (if everything is correct Tamper icon should turn blue)
