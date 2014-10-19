from distutils.core import setup
import sys
from setuptools.command.install import install
import ctypes, os
import json
from os.path import expanduser
import subprocess
from tamper import version

class PostInstallScript(install):

	def run(self):
		install.run(self)
		nativeMessagingManifest = {
			'name': 'com.dutzi.tamper',
			'description': 'Extends the Developer Tools, lets you locally edit files served from the web using Mitmproxy.', 
			'type': 'stdio',
			'allowed_origins': [
				'chrome-extension://mabhojhgigkmnkppkncbkblecnnanfmd/',
				'chrome-extension://ecgndobpbcogellijibmcnjflahddidl/'
			]
		}

		if sys.platform == 'win32':
			nativeMessagingManifest['path'] = 'tamper.bat'
			manifestFilename = expanduser('~\\tamper-manifest.json')
			batchFilename = expanduser('~\\tamper.bat')

			subprocess.call(['reg', 'add', 'HKEY_CURRENT_USER\\SOFTWARE\\Google\\Chrome\\NativeMessagingHosts\\com.dutzi.tamper', '/d', manifestFilename, '/f'])

			manifestFile = open(manifestFilename, 'w')
			json.dump(nativeMessagingManifest, manifestFile, sort_keys=True, indent=4)
			manifestFile.close()

			batchFile = open(batchFilename, 'w')

			batchFile.write('@echo off\npython ' + os.path.split(sys.executable)[0] + '\\Scripts\\tamper.py %*')
			batchFile.close()
		else:
			nativeMessagingManifest['path'] = '/usr/local/bin/tamper.py'

			try:
				is_admin = os.getuid() == 0
			except AttributeError:
				is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0

			manifestFilename = expanduser('~/Library/Application Support/Google/Chrome/NativeMessagingHosts/')
			if not os.path.isdir(manifestFilename):
			    os.mkdir(manifestFilename)

			manifestFilename = manifestFilename + 'com.dutzi.tamper.json'
			print '\nWriting chrome native messaging manifest file (' + manifestFilename + ')'
			print sys.prefix

			manifestFile = open(manifestFilename, 'w')
			json.dump(nativeMessagingManifest, manifestFile, sort_keys=True, indent=4)
			manifestFile.close()

setup(
    name = 'tamper',
    version = version.VERSION,
    description = 'Mitmproxy extension, companion for Tamper. Locally edit files served from the web',
    packages = ['tamper'],
    install_requires = ['gevent-websocket>=0.9.3'],
    scripts = ['tamper/tamper.py'],
    data_files = [
    	('tamper-files', ['cert/index.html', 'cert/mitmproxy.css', 'cert/testfile.txt'])
	],
    license = 'MIT License',
    url = 'http://dutzi.github.com/tamper',
    author = 'dutzi',
    author_email = 'dutzi.b@gmail.com',
	cmdclass = {'install': PostInstallScript}
)