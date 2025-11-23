# Active Users © 2025
# Author:  future_support
# Company: Level Up Marketing & Software Development Services
# Licence: Please refer to LICENSE file


from setuptools import setup, find_packages
from active_users import __version__ as version


with open("requirements.txt") as f:
    install_requires = f.read().strip().split("\n")


setup(
    name="active_users",
    version=version,
    description="Frappe plugin that displays a list of current active users.",
    author="future_support",
    author_email="abdopcnet@gmail.com",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=install_requires
)