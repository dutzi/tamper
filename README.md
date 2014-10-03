# Tamper

A [mitmproxy](http://www.mitmproxy.org) based devtools extension that lets you edit remote files locally and serve them directly to Chrome.

Tamper basically seats between Chrome and the web. Whenever Chrome makes a request, Tamper is notified about it and can do one of two things, it can either let the request "roll", allowing Chrome to load that file from the web, or it can serve Chrome a local file, "fooling" it into thinking it came from the web.

## How do I use Tamper?

Once installed, Tamper will add a new panel to your devtools, the "Tamper" panel. Similar to the Network panel, the Tamper panel shows you a list of all requests made by this page. Click on one of these network requests and the response Chrome got will open in your default editor. Make the changes you need and save the file. Once you hit refresh, Tamper will serve Chrome the file you just saved.

## Installing

Tamper is based on the awesome mitmproxy (man-in-the-middle proxy), or more precisely, libmproxy, its companion library that allows implementing powerful interception proxies. The latest release of Mitmproxy is 0.10, but some of the features Tamper uses will only be released in 0.11 (which should be released in the coming days). Due to this, installing Tamper might be a bit complex.

* Install mitmproxy-0.11-latest from the master
```
git clone https://github.com/mitmproxy/mitmproxy.git
cd mitmproxy
pip install --src . -r requirements.txt
```
* Install Tamper python script
```
pip install tamper
```
* Install [Tamper's devtools extension](https://chrome.google.com/webstore/detail/tamper/mabhojhgigkmnkppkncbkblecnnanfmd)
