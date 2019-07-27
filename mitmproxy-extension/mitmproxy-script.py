import json
import re


def get_filename_for_url(fullURL):

    with open('/usr/local/bin/tamper_mapping.json') as json_file:
        data = json.load(json_file)
        urlsToProxy = data
        json_file.close()

    for url in urlsToProxy:
        regexURL = '^' + re.escape(url['url']).replace('\\*', '.*?') + '$'
        if (re.match(regexURL, fullURL) and url['isEnabled'] == True):
            # send_message(json.dumps(
            #     {'method': 'log', 'message': 'Serving cached file (' + url['cachedFilename'] + ')'}))
            return url['cachedFilename']


class ModifyResponse:
    def __init__(self):
        self.num = 0

    def request(self, flow):
        flow.request.headers['Accept-Encoding'] = 'none'

    def response(self, flow):
        self.num = self.num + 1
        flow.response.headers["Content-Encoding"] = 'identity'

        overridePath = get_filename_for_url(
            flow.request.scheme + '://' + flow.request.host + flow.request.path)

        if overridePath:
            with open('/usr/local/bin/tamper_overrides/' + overridePath) as file:
                flow.response.content = str(file.read()).encode("utf8")
                file.close()

            flow.response.headers["via"] = 'tamper'


addons = [
    ModifyResponse()
]
