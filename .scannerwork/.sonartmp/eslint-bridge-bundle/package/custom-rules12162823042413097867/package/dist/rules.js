"use strict";
/*
 * Copyright (C) 2020-2021 SonarSource SA
 * All rights reserved
 * mailto:info AT sonarsource DOT com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rules = void 0;
const taint_analysis_rule_1 = require("./taint-analysis-rule");
exports.rules = [
    {
        ruleId: 'ucfg',
        ruleModule: taint_analysis_rule_1.ruleFactory(),
        ruleConfig: [],
    },
];
//# sourceMappingURL=rules.js.map