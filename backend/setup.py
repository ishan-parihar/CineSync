from setuptools import setup, find_packages

setup(
    name="lipsync-automation",
    version="2.0.0",
    description="Psycho-cinematic automation system for lip-sync video generation",
    author="Ishan Lagesh",
    packages=find_packages(),
    install_requires=[
        "numpy",
        "Pillow",
        "moviepy",
    ],
    python_requires=">=3.8",
    include_package_data=True,
)