from distutils.core import setup
import sys
from setuptools.command.install import install
import ctypes, os
import json
from os.path import expanduser
import subprocess

class PostInstallScript(install):

	def run(self):
		install.run(self)
		nativeMessagingManifest = {
			'name': 'com.dutzi.chromeproxy',
			'description': 'Extends the Developer Tools, lets you locally edit files served from the web using Mitmproxy.', 
			'type': 'stdio',
			'allowed_origins': [
				'chrome-extension://mabhojhgigkmnkppkncbkblecnnanfmd/',
				'chrome-extension://ecgndobpbcogellijibmcnjflahddidl/'
			]
		}

		if sys.platform == 'win32':
			nativeMessagingManifest['path'] = 'chromeproxy.bat'
			subprocess.call(['reg', 'add', 'HKEY_CURRENT_USER\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.dutzi.chromeproxy', '/d', 'C:\Users\dutzi\chromeproxy-manifest.json', '/f'])
			manifestFilename = expanduser('~\\chromeproxy-manifest.json')
			batchFilename = expanduser('~\\chromeproxy.bat')

			manifestFile = open(manifestFilename, 'w')
			json.dump(nativeMessagingManifest, manifestFile, sort_keys=True, indent=4)
			manifestFile.close()

			batchFile = open(batchFilename, 'w')

			batchFile.write('@echo off\npython ' + os.path.split(sys.executable)[0] + '\\Scripts\\chromeproxy %*')
			batchFile.close()
		else:
			nativeMessagingManifest['path'] = '/usr/local/bin/chromeproxy'

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
    name = 'tamper',
    version = '0.8',
    description = 'Mitmproxy extension, companion for Tamper. Locally edit files served from the web',
    packages = ['chromeproxy'],
    install_requires = ['gevent-websocket>=0.9.3'],
    scripts = ['chromeproxy/chromeproxy'],
    data_files = [
    	('tamper-cert', ['cert/index.html', 'cert/mitmproxy.css', 'cert/p12.p12', 'cert/pem.cer'])
	],
    license = 'MIT License',
    url = 'http://dutzi.github.com/tamper',
    author = 'dutzi',
    author_email = 'dutzi.b@gmail.com',
	cmdclass = {'install': PostInstallScript}
)