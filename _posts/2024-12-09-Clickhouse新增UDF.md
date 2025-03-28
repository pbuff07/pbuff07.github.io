---
title: Clickhouse编写UDF
date: 2024-12-09 14:00:00 +/-TTTT
categories: [Clickhouse]
tags: ['clickhouse', 'udf']     # TAG names should always be lowercase
---





# UDF

UDF全称User Define Function，即用户自定义函数。新版本的Clickhouse支持用户自己定义sql查询用的函数，调用外部的Python、Shell、Golang的脚本即可。



# Clickhouse新增UDF

创建一个示例UDF函数。

首先在`/etc/clickhouse-server/`目录下新增一个`icp_unitname_function.xml`文件

坑：注意文件名一定要有_function.xml，不管前面名称是什么这个必须有，因为config.xml文件中默认加载的udf函数配置是必须有_function.*ml

编辑`icp_unitname_function.xml`添加如下内容

```
<functions>
    <function>
        <type>executable</type>
        <!-- sql查询时的函数名
        <name>icp_unitname</name>
        <!-- 函数返回值的类型
        <return_type>String</return_type>
        <!-- 配置参数名称及对应的类型
        <argument>
            <type>String</type>
            <name>domain</name>
        </argument>
        <!-- 默认返回格式，更多可以参考Clickhouse官网
        <format>TabSeparated</format>
  <!-- udf实际调用的哪个函数
	<command>icp_unitname.sh</command>
    </function>
</functions>
```

创建实际被调用的脚本icp_unitname.sh，文件内容如下，并将icp_unitname.sh存储在`/var/lib/clickhouse/user_scripts/ `目录下即可。

实际被调用的脚本接收的参数个数和类型需要和上述添加的xml配置文件对齐。

```
#!/bin/bash

while read domain; do 
	res=$(sqlite3 /data/icp "select field3 from icp_20241202 where field2 = '$domain'")
	if [ -z "$res" ]; then
		echo "Unknown"
	else
		echo $res
	fi
done
```

进入Clickhouse重新加载函数表并使用新增的UDF函数

> SYSTEM RELOAD FUNCTIONS # 重载函数表
