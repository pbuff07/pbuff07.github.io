---
title: WPS Excel 使用 JS 宏按顿号拆分并汇总为单列
date: 2026-01-22 22:32:00 +/-TTTT
categories: [数据处理]
tags: ['excel', 'wps', 'js', '宏', '数据处理']
---

在无网、无编程环境下遇到的一个Excel数据处理问题。

某一列单元格中有很多顿号分隔的数据，比如a、b、c，需要按照顿号进行分隔后输出在一列上面。

```
a、b、c 处理之后需要转换成
	a
	b
	c
```

有很多行数据，直接分列处理之后不能全部汇总在一列，尝试过转置、多行合并等方式均不好实现。

解决办法是编写js宏，直接使用代码处理，具体代码如下:

```
Afunction splitAndMergeToOneColumn() {
    var sheet = Application.ActiveSheet;

    var srcCol = 1; // A列
    var dstCol = 2; // B列

    var lastRow = sheet.UsedRange.Rows.Count;

    var outRow = 1;

    for (var r = 1; r <= lastRow; r++) {
        var cell = sheet.Cells(r, srcCol).Text;
        if (!cell) continue;

        var parts = cell.toString().split("、");

        for (var i = 0; i < parts.length; i++) {
            var v = parts[i].replace(/^\s+|\s+$/g, "");
            if (v === "") continue;

            sheet.Cells(outRow, dstCol).Value2 = v;
            outRow++;
        }
    }

}

```

处理效果如图：

![image-20260122223216696](https://pbuff-blogs-1257793641.cos.ap-chengdu.myqcloud.com/1.jpg)

