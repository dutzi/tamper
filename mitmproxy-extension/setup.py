from distutils.core import setup
import sys
from setuptools.command.install import install
import ctypes, os
import json
from os.path import expanduser

class PostInstallScript(install):

	def run(self):
		install.run(self)

		nativeMessagingManifest = {
			'name': 'com.dutzi.chromeproxy',
			'description': 'Extends the Developer Tools, lets you locally edit files served from the web using Mitmproxy.', 
			'path': '/usr/local/bin/chromeproxy',
			'type': 'stdio',
			'allowed_origins': [
				'chrome-extension://bkblajiolelpgnnnclnjkcpmlbnanpkf/',
				'chrome-extension://blljdmmacfmkjekijajfdmmacpemmlaa/'
			]
		}

		try:
			is_admin = os.getuid() == 0
		except AttributeError:
			is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0

		manifestFilename = expanduser('~/Library/Application Support/Google/Chrome/NativeMessagingHosts/')
		if not os.path.isdir(manifestFilename):
		    os.mkdir(manifestFilename)

		manifestFilename = manifestFilename + 'com.dutzi.chromeproxy.json'
		print '\nWriting chrome native messaging manifest file (' + manifestFilename + ')'
		print sys.prefix

		manifestFile = open(manifestFilename, 'w')
		json.dump(nativeMessagingManifest, manifestFile, sort_keys=True, indent=4)
		manifestFile.close()

setup(
    name = 'chrome-proxy',
    version = '0.1',
    packages = ['chromeproxy'],
    install_requires = ['gevent-websocket>=0.9.3'],
    scripts = ['chromeproxy/chromeproxy'],
    license = 'MIT License',
    url = 'http://dutzi.github.com/chrome-proxy',
    author = 'dutzi',
    author_email = 'dutzi.b@gmail.com',
	cmdclass = {'install': PostInstallScript}
)