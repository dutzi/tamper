#!/usr/bin/python
import sys
import struct
import os
from os.path import expanduser
import threading
import json
import time
import re
import urllib2
import uuid
import Queue
from netlib.odict import ODictCaseless
import subprocess
from subprocess import call

def send_message(message):
    message = '{"msg": %s}' % message
    sys.stdout.write(struct.pack('I', len(message)))
    sys.stdout.write(message)
    sys.stdout.flush()

try:
    from libmproxy import proxy, flow
    from libmproxy.protocol.http import HTTPResponse
    from libmproxy.proxy.config import ProxyConfig
    from libmproxy.proxy.server import ProxyServer
    from libmproxy.encoding import decode_gzip
    from libmproxy.proxy.primitives import ProxyServerError
except:
    send_message(json.dumps({
        'method': 'proxy-error',
        'errorCode': 101,
        'errorDesc': 'Could not start proxy, error loading libraries'
    }))
    sys.exit(1)

sharedVars = {
    'shouldClose': False
}
urlsToProxy = []

def unload_daemons():
    # return;
    sharedVars['server'].shutdown()
    sharedVars['shouldClose'] = True

def start_server(port):
    state = flow.State()

    proxyConfig = proxy.config.ProxyConfig(
        port = int(port)
    )

    try:
        server = proxy.server.ProxyServer(proxyConfig)
        m = InjectingMaster(server, state)
        sharedVars['server'] = m
        send_message(json.dumps({'method': 'proxy-started'}))
        m.run()

    except ProxyServerError:
        send_message(json.dumps({
            'method': 'proxy-error',
            'errorCode': 100,
            'errorDesc': 'Could not start proxy, port ' + str(port) + ' is in use'
        }))
        # sharedVars['shouldClose'] = True
        sys.exit(0)
    

# Thread that reads messages from the webapp.
def read_thread_func(queue):
    message_number = 0
    while 1:
        # Read the message length (first 4 bytes).
        text_length_bytes = sys.stdin.read(4)

        if len(text_length_bytes) == 0:
            if queue:
                queue.put(None)
            unload_daemons()
            sys.exit(0)

        # Unpack message length as 4 byte integer.
        text_length = struct.unpack('i', text_length_bytes)[0]

        # Read the text (JSON object) of the message.
        text = sys.stdin.read(text_length).decode('utf-8')

        message = json.loads('%s' % text)

        if message == None:
            unload_daemons()
            sys.exit(0)
        else:


            if (message['method'] == 'hello'):
                send_message(json.dumps({'method': 'hello'}))
                send_message(json.dumps({'method': 'version', 'version': '0.24.1'}))

            elif (message['method'] == 'update-rules'):
                while len(urlsToProxy):
                    urlsToProxy.pop()

                for rule in message['rules']:
                    urlsToProxy.append(rule)

                send_message(json.dumps(message))

            elif (message['method'] == 'open-file'):
                if ('testFile' in message):
                    filename = sys.prefix + '/tamper-files/testfile.txt'
                else:
                    filename = os.path.dirname(os.path.realpath(__file__)) + '/replacements/' + message['filename']

                try:
                    if message['command'] != '':
                        if os.name == 'nt':
                            subprocess.Popen([message['command'], filename])
                        else:
                            call([message['command'], filename])
                    else:
                        if os.name == 'nt':
                            os.startfile(filename)
                        else:
                            call(['open', filename])

                    send_message(json.dumps(message))
                except:
                    message['error'] = {
                        'errorCode': 1,
                        'errorDesc': 'Could not open file',
                        'pythonError': '%s' % ','.join(map(str,sys.exc_info()))
                    }
                    send_message(json.dumps(message))

            elif (message['method'] == 'start-proxy'):
                send_message(json.dumps({'method': 'log', 'message': 'Starting proxy... (' + str(message['port']) + ')'}))

                if 'server' in sharedVars:
                    sharedVars['server'].shutdown()
                    sharedVars.pop('server')

                thread = threading.Thread(target=start_server, args=(message['port'],))
                thread.daemon = True
                thread.start()

                send_message(json.dumps(message))

            elif (message['method'] == 'cache-response'):
                try:
                    urlFilename = message['filename']
                    while True:
                        filename = str(uuid.uuid1()) + '.' + urlFilename
                        fullFilePath = os.path.dirname(os.path.realpath(__file__)) + '/replacements/' + filename
                        if not os.path.isfile(fullFilePath):
                            break

                    localFile = open(fullFilePath, 'w')
                    localFile.write(message['responseContent'].encode('utf8'))
                    localFile.close()

                    # Sending the response content when the response is too big (?) causes 
                    # read_thread_func to stop functioning on Windows, need to check that
                    # for now I'll just leave `responseContent` out
                    message.pop('responseContent')

                    # send_message(json.dumps({'method': 'rule-added', 'rule': rule}))
                    message['cachedFilename'] = filename
                    send_message(json.dumps(message))
                except:
                    message['error'] = {
                        'errorCode': 1,
                        'errorDesc': 'Could not cache response',
                        'pythonError': '%s' % ','.join(map(str,sys.exc_info()))
                    }
                    send_message(json.dumps(message))
                    

class InjectingMaster(flow.FlowMaster):
    def __init__(self, server, state):
        flow.FlowMaster.__init__(self, server, state)

        relPath = os.path.dirname(os.path.realpath(__file__)) + '/'

        # _requestMapFile = open(config['requestMapPath'], 'r+')
        # requestMap = json.load(_requestMapFile)['rules']
        self._cachedFilesPath = relPath + 'replacements/'
        # while len(urlsToProxy):
        #     urlsToProxy.pop()

        # sharedVars['rules'] = [];

        # for url in requestMap:
        #     urlsToProxy.append(url)
        #     sharedVars['rules'].append(url)


    def run(self):
        try:
            return flow.FlowMaster.run(self)
        except KeyboardInterrupt:
            self.shutdown()

    def handle_request(self, msg):
        f = flow.FlowMaster.handle_request(self, msg)

        fullURL = f.request.scheme + '://' + f.request.host
        if ((f.request.scheme == 'http' and f.request.port == 80) == False and (f.request.scheme == 'https' and f.request.port == 443) == False):
            fullURL = fullURL + ':' + str(f.request.port)
        fullURL = fullURL + f.request.path

        send_message(json.dumps({'method': 'log', 'message': fullURL}))

        if (f.request.host == 'mitm.it'):
            path = f.request.path

            if path.find('?') > -1:
                path = path[:path.find('?')]

            if path == '/':
                path = '/index.html'

            mimeType = '';
            if path.rfind('.') > -1:
                extension = path[path.rfind('.') + 1:]
                if extension == 'html':
                    mimeType = 'text/html'
                elif extension == 'css':
                    mimeType = 'text/css'
                elif extension == 'cer':
                    mimeType = 'application/pkix-cert'
                elif extension == 'pem':
                    mimeType = 'application/x-pem-file'
                elif extension == 'p12':
                    mimeType = 'application/x-pkcs12'

            responseHeaders = ODictCaseless([('content-type', mimeType)])

            try:
                if path in ['/mitmproxy-ca-cert.cer', '/mitmproxy-ca-cert.pem', '/mitmproxy-ca-cert.p12']:
                    with open(expanduser('~/.mitmproxy' + path), 'rb') as certfile:
                        content = certfile.read()
                elif path in ['/index.html', '/mitmproxy.css']:
                    with open(sys.prefix + '/tamper-cert' + path, 'rb') as uifile:
                        content = uifile.read()

                responseHeaders['Content-Length'] = [len(content)]

                resp = HTTPResponse([1,1], 200, 'OK', responseHeaders, content)
                msg.reply(resp)
            except:
                resp = HTTPResponse([1,1], 404, 'Not Found', ODictCaseless([]), '')
                msg.reply(resp)

        for url in urlsToProxy:
            regexURL = '^' + re.escape(url['url']).replace('\\*', '.*?') + '$'
            if (re.match(regexURL, fullURL) and url['isEnabled'] == True):
                send_message(json.dumps({'method': 'log', 'message': 'Serving cached file (' + url['cachedFilename'] + ')'}))
                localFile = open(self._cachedFilesPath + url['cachedFilename'], 'r');
                content = localFile.read()
                localFile.close();

                responseHeaders = []
                hasViaHeader = False
                for header in url['responseHeaders']:
                    if (header['name'].lower() != 'content-encoding'):
                        if (header['name'].lower() == 'via'):
                            hasViaHeader = True
                            if (header['value'].find('tamper') == -1):
                                header['value'] += ', tamper'

                        responseHeaders.append((header['name'], header['value']))

                if (not hasViaHeader):
                    responseHeaders.append(['via', 'tamper'])

                responseHeaders.append(['Cache-Control', 'no-cache, no-store, must-revalidate'])
                responseHeaders.append(['Pragma', 'no-cache'])
                responseHeaders.append(['Expires', '0'])

                resp = HTTPResponse([1,1], 200, 'OK', ODictCaseless(responseHeaders), content)
                msg.reply(resp)
                break


        if 'Accept-Encoding' in f.request.headers:
            f.request.headers['Accept-Encoding'] = ['none']

        if f:
            msg.reply()

        return f

    def handle_responseheaders(self, f):
        f.response.stream = True

        f.reply()
        return f

    def handle_response(self, msg):
        f = flow.FlowMaster.handle_response(self, msg)

        if f:
            msg.reply()

        return f

config = {}

# def save_request_map():
#     requestMapFile = open(config['requestMapPath'], 'r+')
#     requestMapFile.seek(0)
#     requestMapFile.truncate()
#     json.dump({'rules': urlsToProxy}, requestMapFile, sort_keys=True, indent=4)
#     requestMapFile.close()

def main(argv):
    relPath = os.path.dirname(os.path.realpath(__file__)) + '/'
    config['requestMapPath'] = relPath + 'requestmap.json'

    if not os.path.isdir(relPath + 'replacements/'):
        os.mkdir(relPath + 'replacements/')

    # if not os.path.exists(config['requestMapPath']):
    #     f = open(config['requestMapPath'],'w')
    #     f.write('{"rules": []}')
    #     f.close()


    queue = Queue.Queue()
    thread = threading.Thread(target=read_thread_func, args=(queue,))
    thread.daemon = True
    thread.start()

    if len(argv) > 1 and argv[1] == '-p':
        start_server(int(argv[2]))

    while not sharedVars['shouldClose']:
        time.sleep(1)
    

if __name__ == '__main__':
    main(sys.argv)
