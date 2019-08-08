import json
import re


def get_file_object_for_url(fullURL):

    with open('/usr/local/bin/tamper_mapping.json') as json_file:
        data = json.load(json_file)
        urlsToProxy = data
        json_file.close()

    for url in urlsToProxy:
        regexURL = '^' + re.escape(url['url']).replace('\\*', '.*?') + '$'
        if (re.match(regexURL, fullURL) and url['isEnabled'] == True):
            # send_message(json.dumps(
            #     {'method': 'log', 'message': 'Serving cached file (' + url['cachedFilename'] + ')'}))
            return url


class ModifyResponse:
    def __init__(self):
        self.num = 0

    def request(self, flow):
        flow.request.headers['Accept-Encoding'] = 'none'

    def response(self, flow):
        self.num = self.num + 1
        flow.response.headers["Content-Encoding"] = 'identity'
        flow.response.status_code = 200
        flow.response.reason = 'OK'
        file_object = get_file_object_for_url(
            flow.request.scheme + '://' + flow.request.host + flow.request.path)

        if file_object:
            with open('/usr/local/bin/tamper_overrides/' + file_object['cachedFilename']) as file:
                flow.response.content = str(file.read()).encode("utf8")
                file.close()

            hasViaHeader = False
            for header in file_object['responseHeaders']:
                if (header['name'].lower() != 'content-encoding'):
                    if (header['name'].lower() == 'via'):
                        hasViaHeader = True
                        if (header['value'].find('tamper') == -1):
                            header['value'] += ', tamper'

                    flow.response.headers[str(header['name'])] = str(
                        header['value'])

            # flow.response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            # flow.response.headers['Pragma'] = 'no-cache'
            # flow.response.headers['Expires'] = '0'
            if (not hasViaHeader):
                flow.response.headers['via'] = 'tamper'

            # flow.response.headers["via"] = 'tamper'


addons = [
    ModifyResponse()
]
