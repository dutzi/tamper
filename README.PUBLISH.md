# PIP

1. Update the version in `mitmproxy-extension/tamper/version.py` and `mitmproxy-extension/tamper/tamper.py`.
2. Run `sudo python setup.py sdist bdist_wininst upload`

# Chrome Store

1. `grunt build` will build and zip a package (placing it in packages/)
2. Go to https://chrome.google.com/webstore/developer/dashboard and upload the zipped package.

The Chrome extension will get python extension's version via a message. If the major or minor numbers are different a message will show up asking the user to upgrade (the patch number can vary).
